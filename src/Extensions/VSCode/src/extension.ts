// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { DocuGen, Constants as DocuGenConstants, Enums, ConfigProvider, DocuGenConfig, SectionConfig,SettingEnums } from 'docugen';
import path from 'path';
import { VSCodeSecretProvider } from './providers/VSCodeSecretProvider';
const defaultExtension: string = '.md';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const scan = vscode.commands.registerCommand(DocuGenConstants.extensionName.toLowerCase() + '.scanRepository', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			const workspaceFsPath = workspaceFolder?.uri.fsPath;
			if (workspaceFsPath !== undefined) {

				const workspacePathPrefix = workspaceFsPath + "\\";
				const defaultDocumentFileNameSettingName = SettingEnums.DefaultDocumentFileName;
				const docuGenConfig = new ConfigProvider(workspacePathPrefix, new SectionConfig(Enums.VSCode)).getConfig();
				const sectionConfig = docuGenConfig.sections.filter(x => x.name === Enums.VSCode)[0];
				const defaultDocumentFileNameConfig = docuGenConfig.get(Enums.VSCode, defaultDocumentFileNameSettingName, DocuGenConstants.extensionName);
				const defaultDocumentFileName: string = defaultDocumentFileNameConfig;
				const defaultDocumentFileNamePath = defaultDocumentFileName + defaultExtension;

				let uncheckedItems = getUncheckedItems(docuGenConfig);
				let excludedItems: string[] = getExcludedItems(docuGenConfig);
				let supportedExtensions: string[] = getSupportedExtensions(docuGenConfig);
				const allFiles = getItemsRecursively(docuGenConfig, excludedItems, workspaceFsPath);

				if (allFiles.includes('.gitignore')) {
					getGitIgnoreItems(workspaceFsPath, excludedItems);
				}

				// Show user a quick pick with only folder list to exclude
				var quickPick = await vscode.window.createQuickPick();
				quickPick.title = 'Select files and folders';
				quickPick.placeholder = 'Select files to generate documentation for..';
				quickPick.ignoreFocusOut = true;
				quickPick.step = 1;
				quickPick.totalSteps = 1;

				// Get all directories and files recursively 
				const items = excludeInvalidFiles(allFiles);
				quickPick.items = items.map(item => {
					const fullPath = path.join(workspaceFsPath, item);
					const isDirectory = fs.statSync(fullPath).isDirectory();
					const ext = path.extname(item).toLowerCase();
					return {
						label: item,
						description: fullPath,
						iconPath: isDirectory
							? new vscode.ThemeIcon('folder')
							: new vscode.ThemeIcon(getFileIcon(ext))

					};
				});
				quickPick.canSelectMany = true;
				// Pre-select an item by setting it in `selectedItems` (not `activeItems`).
				let itemsToBeSelected: vscode.QuickPickItem[] = [];
				quickPick.items.forEach((item) => {
					if (!excludedItems.includes(item.label?.trim()) && !uncheckedItems.includes(item.label?.trim())) {
						itemsToBeSelected.push(item);  // Pre-select items that are NOT in the exclusion list (i.e., items to be included)
					}
				});

				quickPick.selectedItems = itemsToBeSelected;  // Pre-select the items to be included
				let currentlySelectedItems: Set<string> = new Set(); // Tracks currently selected items 
				quickPick.onDidChangeSelection(selection => {
					const selectedItems = new Set(selection.map(item => item.label));

					// Find items that have been newly selected or deselected
					const newlySelectedItems = [...selectedItems].filter(item => !currentlySelectedItems.has(item));
					const newlyDeselectedItems = [...currentlySelectedItems].filter(item => !selectedItems.has(item));

					// Process newly selected items (recursive selection for directories)
					newlySelectedItems.forEach(item => {
						// If parent (directory) selected, add all children
						const children = getChildren(item, items);
						children.forEach(child => selectedItems.add(child));
					});

					// Process newly deselected items (recursive deselection for directories)
					newlyDeselectedItems.forEach(item => {
						// If parent (directory) deselected, remove all its children
						const children = getChildren(item, items);
						children.forEach(child => selectedItems.delete(child));
					});

					// Update the final selection state
					currentlySelectedItems = new Set(selectedItems);
					quickPick.selectedItems = quickPick.items.filter(item => selectedItems.has(item.label));
				});
				quickPick.onDidAccept(async () => {
					const selectedItems = quickPick.selectedItems;
					let itemsToBeIncluded = selectedItems.map(item => item.label) ?? undefined;

					if (itemsToBeIncluded !== undefined && itemsToBeIncluded.length > 0) {
						let uncheckedItems = quickPick.items
							.filter(item => !selectedItems.includes(item))
							.map(item => item.label);

						// Update the configuration with the selected items
						itemsToBeIncluded = removeDuplicates(itemsToBeIncluded);
						uncheckedItems = removeDuplicates(uncheckedItems);
						excludedItems = removeDuplicates(excludedItems.concat(DocuGenConstants.excludedItems.split(',')));
						supportedExtensions = removeDuplicates(supportedExtensions);

						docuGenConfig.update(Enums.VSCode, SettingEnums.IncludedItems, itemsToBeIncluded.join());
						docuGenConfig.update(Enums.VSCode, SettingEnums.UncheckedItems, uncheckedItems.join());
						docuGenConfig.update(Enums.VSCode, SettingEnums.ExcludedItems, excludedItems.join());
						docuGenConfig.update(Enums.VSCode, SettingEnums.SupportedExtensions, supportedExtensions.join());

						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification,
							title: "DocuGen: ",
						}, async (progress, token) => {
							try {
								progress.report({ message: "Generating documentation for selected files..." });
								await new DocuGen(
									getSecretProvider()
								).scanRepository(
									sectionConfig,
									workspacePathPrefix,
									excludeInvalidFiles(excludedItems),
									excludeInvalidFiles(supportedExtensions),
									excludeInvalidFiles(itemsToBeIncluded),
									defaultDocumentFileNamePath);

								progress.report({ message: "Please verify the documentation" });

							} catch (error) {
								vscode.window.showErrorMessage(`DocuGen: ${error}`);
							}
						});
					} else {
						vscode.window.showInformationMessage('No item selected.');
					}

					quickPick.dispose();  // Always dispose of the quickPick once done.
				});

				quickPick.show();
			}
		}
	});

	context.subscriptions.push(scan);
}

// This method is called when your extension is deactivated
export function deactivate() { }

function excludeInvalidFiles(files: string[]) {
	return files.filter(x => path.extname(x) !== '');
}

function removeDuplicates(arr: string[]): string[] {
	return [...new Set(arr.filter(item => item.trim() !== ''))];
}

// Function to get all child items (files and folders) of a given folder 
function getChildren(parent: string, allItems: string[]): string[] {
	return allItems.filter(item => item.startsWith(parent + path.sep));
}

// Function to get file icon based on extension
function getFileIcon(extension: string): string {
	switch (extension) {
		case '.js': case '.ts': case '.jsx': case '.tsx': case '.json':
			return 'file-code'; // Code files
		case '.json':
			return 'file-json'; // JSON files
		case '.md': case '.txt':
			return 'file-text'; // Text files
		case '.png': case '.jpg': case '.jpeg': case '.gif':
			return 'file-media'; // Image files
		case '.pdf':
			return 'file-pdf'; // PDF files
		case '.zip': case '.tar': case '.gz':
			return 'file-zip'; // Archive files
		default:
			return 'file'; // Default icon for other files
	}
}

// Function to get all directories and files recursively 
function getItemsRecursively(docuGenConfig: DocuGenConfig, excludedItems: string[], source: string, parent: string = ''): string[] {
	let itemsList: string[] = [];

	try {
		const items = fs.readdirSync(source);
		const filteredItems = removeDuplicates(items.filter(x => !excludedItems.includes(x)));
		for (const item of filteredItems) {
			// Exclude items starting with a dot ('.')
			if (item.startsWith('.')) {
				continue; // Skip files and folders starting with '.'
			}

			const fullPath = path.join(source, item);
			const relativePath = path.join(parent, item);

			if (fs.statSync(fullPath).isDirectory()) {
				// Add the directory to the list 
				itemsList.push(relativePath);

				// Recursively get subdirectories and files 
				itemsList = itemsList.concat(getItemsRecursively(docuGenConfig, excludedItems, fullPath, relativePath));
			} else {
				// Add the file to the list
				const ext = path.extname(item).toLowerCase();
				if (ext.length > 0) {
					// Exclude non-standard file types
					const isSupported = isSupportedExtFile(docuGenConfig, ext);
					if (isSupported === true) {
						// Add the file to the list 
						itemsList.push(relativePath);
					}
				}
			}
		}
	} catch (err) {
		vscode.window.showErrorMessage(`Error reading directories: ${err}`);
	}

	return itemsList;
}

function getGitIgnoreItems(workspaceFsPath: string, excludedItems: string[]): string[] {
	// Read .gitignore file if present & exclude the folders & extensions
	const gitIgnorePath = workspaceFsPath + '/.gitignore';
	let gitIgnoreContent = '';
	if (gitIgnorePath) {
		try {
			gitIgnoreContent = fs.readFileSync(gitIgnorePath).toString();
			const gitExcludeItemsList = gitIgnoreContent
				.split('\n')
				.filter(line => (line.trim().startsWith('/') || line.trim().endsWith('/')))
				.map(folder => folder.trim())
				.filter(folder => !excludedItems.includes(folder.trim()));

			// Remove duplicates by converting to a Set
			for (const item of gitExcludeItemsList) {
				if (!excludedItems.includes(item.trim())) {
					excludedItems.push(item.trim());
				}
			}
		} catch (error) {
			console.log('No .gitignore file found');
		}
	}

	return excludedItems;
}

function getExcludedItems(docuGenConfig: DocuGenConfig): string[] {
	let excludedFolders = docuGenConfig.get(Enums.VSCode, SettingEnums.ExcludedItems, DocuGenConstants.excludedItems);
	return removeDuplicates(excludedFolders.split(',').concat(DocuGenConstants.excludedItems.split(',')).filter(x => x.trim() !== ''));
}

function getUncheckedItems(docuGenConfig: DocuGenConfig): string[] {
	let excludedFolders = docuGenConfig.get(Enums.VSCode, SettingEnums.UncheckedItems, "");
	return removeDuplicates(excludedFolders.split(',').filter(x => x.trim() !== ''));
}

function getSupportedExtensions(docuGenConfig: DocuGenConfig) {
	let supportedExtensions = docuGenConfig.get(Enums.VSCode, SettingEnums.SupportedExtensions, DocuGenConstants.supportedExtensions);
	return removeDuplicates(supportedExtensions.split(',').concat(DocuGenConstants.supportedExtensions.split(',')).filter(x => x.trim() !== ''));
}

// Function to determine if a file extension should be excluded
function isSupportedExtFile(docuGenConfig: DocuGenConfig, extension: string): boolean {
	return getSupportedExtensions(docuGenConfig).includes(extension);
}

function getSecretProvider() {
	return new VSCodeSecretProvider();
}