// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { DocuGen, Providers, Constants } from 'docugen';
import path from 'path';
import { VSCodeSecretProvider } from './providers/VSCodeSecretProvider';

const defaultExtension: string = '.md';
const includedItemsSettingName: string = 'includedItems';
const excludedItemsSettingName: string = 'excludedItems';
const supportedExtensionsSettingName: string = 'supportedExtensions';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const scan = vscode.commands.registerCommand(Constants.extensionName.toLowerCase() + '.scanRepository', async () => {
		const config = getConfiguration();
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			const workspaceFsPath = workspaceFolder?.uri.fsPath;
			if (workspaceFsPath !== undefined) {
				const workspacePathPrefix = workspaceFsPath + "\\";
				const defaultDocumentFileNameSettingName = 'defaultDocumentFileName';
				const defaultDocumentFileNameConfig = config.get(defaultDocumentFileNameSettingName, Constants.extensionName);
				const defaultDocumentFileName: string = defaultDocumentFileNameConfig;
				const defaultDocumentFileNamePath = defaultDocumentFileName + defaultExtension;

				let masterExcludeItemsList: string[] = getExcludedFolders();
				if (masterExcludeItemsList.length > 0) {
					for (const item of [defaultDocumentFileNamePath, 'node_modules', '.vscode', '.git', '.gitignore']) {
						const itemPath = workspacePathPrefix + item
						if (item !== '' && !masterExcludeItemsList.includes(itemPath)) {
							masterExcludeItemsList.push(itemPath)
						}
					}
				}
				else {
					for (const item of masterExcludeItemsList) {
						if (item !== '' && !masterExcludeItemsList.includes(item)) {
							const itemPath = workspacePathPrefix + item;
							masterExcludeItemsList.push(itemPath);
						}
					}
				}
				let mastersupportedExtensionsList: string[] = getSupportedExtensions();
				for (const item of mastersupportedExtensionsList) {
					if (item !== '' && !mastersupportedExtensionsList.includes(item)) {
						mastersupportedExtensionsList.push(item);
					}
				}

				// Read .gitignore file if present & exclude the folders & extensions
				const gitIgnorePath = workspaceFsPath + '/.gitignore';
				let gitIgnoreContent = '';
				if (gitIgnorePath) {
					try {
						gitIgnoreContent = await vscode.workspace.fs.readFile(vscode.Uri.file(gitIgnorePath)).then(content => {
							return Buffer.from(content).toString();
						});
						const gitExcludeItemsList = gitIgnoreContent
							.split('\n')
							.filter(line => (line.trim().startsWith('/') || line.trim().endsWith('/')))
							.map(folder => folder.trim())
							.filter(folder => !masterExcludeItemsList.includes(folder.trim()));

						// Remove duplicates by converting to a Set
						for (const item of gitExcludeItemsList) {
							if (!masterExcludeItemsList.includes(item.trim()))
								masterExcludeItemsList.push(item.trim());
						}
					} catch (error) {
						console.log('No .gitignore file found');
					}
				}

				// Show user a quick pick with only folder list to exclude
				var quickPick = await vscode.window.createQuickPick();
				quickPick.title = 'Select files and folders to exclude from document generation';
				quickPick.placeholder = 'Exclude files and folders to exclude from document generation';
				quickPick.ignoreFocusOut = true;
				quickPick.step = 1
				quickPick.totalSteps = 1;
				// Get all directories and files recursively 
				const items = excludeInvalidFiles(getItemsRecursively(workspaceFsPath));
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
				let matchingItems: vscode.QuickPickItem[] = [];
				quickPick.items.forEach((item) => {
					if (!masterExcludeItemsList.includes(item.description?.trim())) {
						matchingItems.push(item);  // Pre-select items that are NOT in the exclusion list (i.e., items to be included)
					}
				});

				quickPick.selectedItems = matchingItems;  // Pre-select the items to be included
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
					const itemsToBeIncluded = selectedItems.map(item => item.description) ?? undefined;

					if (itemsToBeIncluded !== undefined && itemsToBeIncluded.length > 0) {
						let excludedItems = quickPick.items
							.filter(item => !selectedItems.includes(item))
							.map(item => item.description);

						config.update(includedItemsSettingName, removeDuplicates(itemsToBeIncluded), vscode.ConfigurationTarget.Workspace);
						config.update(excludedItemsSettingName, removeDuplicates(excludedItems), vscode.ConfigurationTarget.Workspace);
						config.update(supportedExtensionsSettingName, removeDuplicates(mastersupportedExtensionsList), vscode.ConfigurationTarget.Workspace);

						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification,
							title: "DocuGen: Generating Documentation..",
						}, async (progress, token) => {
							try {
								progress.report({ message: "Scanning repository for files..." });
								await new DocuGen(new Providers(getSecretProvider())).scanRepository(workspaceFsPath, excludeInvalidFiles(excludedItems), excludeInvalidFiles(mastersupportedExtensionsList), excludeInvalidFiles(itemsToBeIncluded), defaultDocumentFileNamePath);//progress

								progress.report({ message: "Please verify the documentation" });

							} catch (error) {
								vscode.window.showErrorMessage(`DocuGen: An error occurred: ${error}`);
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
	return files.filter(x => path.extname(x) !== '')
}

function removeDuplicates(arr: string[]): string[] {
	return [...new Set(arr)];
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
function getItemsRecursively(source: string, parent: string = ''): string[] {
	let itemsList: string[] = [];

	try {
		const items = fs.readdirSync(source);
		const folderExclusions = getExcludedFolders();
		const filteredItems = items.filter(x => !folderExclusions.includes(x));
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
				itemsList = itemsList.concat(getItemsRecursively(fullPath, relativePath));
			} else {
				// Add the file to the list
				// itemsList.push(relativePath);

				const ext = path.extname(item).toLowerCase();
				if (ext.length > 0) {
					// Exclude non-standard file types
					const isSupported = isSupportedExtFile(ext);
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

function getExcludedFolders(): string[] {
	let excludedFolders = getConfiguration().get<string[]>(excludedItemsSettingName);
	const excludedFoldersFromConstant = Constants.excludedFolders;
	if (excludedFolders === undefined || excludedFolders.length === 0)
		excludedFolders = excludedFoldersFromConstant;
	else {
		excludedFolders.concat(excludedFoldersFromConstant);
	}

	return excludedFolders;
}

function getSupportedExtensions() {
	let supportedExtensions = getConfiguration().get<string[]>(supportedExtensionsSettingName);
	if (supportedExtensions === undefined || supportedExtensions.length === 0)
		supportedExtensions = Constants.supportedExtensions;

	return supportedExtensions;
}

// Function to determine if a file extension should be excluded
function isSupportedExtFile(extension: string): boolean {
	return getSupportedExtensions().includes(extension);
}

function getConfiguration() {
	return getSecretProvider().getConfiguration();
}
function getSecretProvider() {
	return new VSCodeSecretProvider();
}