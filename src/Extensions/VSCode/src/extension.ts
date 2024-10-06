// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { DocuGen, Constants as DocuGenConstants, Enums, SectionConfig, SettingEnums } from 'docugen';
import path from 'path';
import { VSCodeSecretProvider } from './providers/VSCodeSecretProvider';
const defaultExtension: string = '.md';
const extensionName = DocuGenConstants.extensionName.toLowerCase();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const scan = vscode.commands.registerCommand(extensionName + '.scanRepository', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			const workspaceFsPath = workspaceFolder?.uri.fsPath;
			if (workspaceFsPath !== undefined) {
				const workspaceSettings = vscode.workspace.getConfiguration(extensionName);
				const modelEndpoint = workspaceSettings.get('modelEndpoint') as string ?? undefined;
				const modelName = workspaceSettings.get('modelName') as string ?? undefined;
				const modelVersion = workspaceSettings.get('modelApiVersion') as string ?? undefined;
				const secretProvider = getSecretProvider();
				const modelApiKey = await secretProvider.getSecret('modelApiKey') ?? undefined;
				const useOllama = workspaceSettings.get('useOllama') as boolean;
				if (validModelConfig(modelEndpoint, modelName, modelVersion, modelApiKey)) {
					const workspacePathPrefix = workspaceFsPath + "\\";
					const configFilePath = workspacePathPrefix + DocuGenConstants.configFileName;
					let sectionConfig = new SectionConfig(
						Enums.VSCode,
						extensionName,
						DocuGenConstants.excludedItems,
						'',
						'',
						DocuGenConstants.supportedExtensions);

					if (!vsCodeConfigExists(configFilePath)) {
						const existingSections = readConfigFile(configFilePath);
						existingSections.push(sectionConfig);
						writeConfigFile(configFilePath, existingSections);
					}
					else {
						const sectionFromConfig = readConfigFile(configFilePath).filter(x => x.name === Enums.VSCode);
						if (sectionFromConfig.length > 0) {
							sectionConfig = sectionFromConfig[0];
						}
					}

					let uncheckedItems: string[] = [];
					if (sectionConfig.values.uncheckedItems.length > 0 && sectionConfig.values.uncheckedItems.includes(',')) {
						uncheckedItems = getUncheckedItems(sectionConfig.values.uncheckedItems.split(','));
					}
					else {
						uncheckedItems = getUncheckedItems();
					}

					let excludedItems: string[] = [];
					if (sectionConfig.values.excludedItems.length > 0 && sectionConfig.values.excludedItems.includes(',')) {
						excludedItems = getExcludedItems(sectionConfig.values.excludedItems.split(','));
					}
					else {
						excludedItems = getExcludedItems();
					}

					let supportedExtensions: string[] = [];
					if (sectionConfig.values.supportedExtensions.length > 0 && sectionConfig.values.supportedExtensions.includes(',')) {
						supportedExtensions = getSupportedExtensions(sectionConfig.values.supportedExtensions.split(','));
					}
					else {
						supportedExtensions = getSupportedExtensions();
					}

					const allFiles = getItemsRecursively(excludedItems, workspaceFsPath);
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
					const items = excludeInvalidExtensions(allFiles);
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
						let itemsToBeIncluded = selectedItems.map(item => item.label) ?? [];

						if (itemsToBeIncluded.length > 0) {
							let uncheckedItems = quickPick.items
								.filter(item => !selectedItems.includes(item))
								.map(item => item.label);

							// Update the configuration with the selected items
							itemsToBeIncluded = removeDuplicates(excludeInvalidExtensions(itemsToBeIncluded));
							uncheckedItems = removeDuplicates(excludeInvalidExtensions(uncheckedItems));
							excludedItems = removeDuplicates(excludeInvalidFilesAndFolder(excludedItems).concat(
								DocuGenConstants.excludedItems.split(',')
							));
							supportedExtensions = removeDuplicates(supportedExtensions.concat(DocuGenConstants.supportedExtensions.split(',')));

							sectionConfig.values.includedItems = itemsToBeIncluded.join();
							sectionConfig.values.uncheckedItems = uncheckedItems.join();
							sectionConfig.values.excludedItems = excludedItems.join();
							sectionConfig.values.supportedExtensions = supportedExtensions.join();

							updateConfigFile(configFilePath, sectionConfig);

							vscode.window.withProgress({
								location: vscode.ProgressLocation.Notification,
								title: "DocuGen: ",
							}, async (progress, token) => {
								try {
									progress.report({ message: "Generating documentation for selected files..." });

									const workspaceSettings = vscode.workspace.getConfiguration(extensionName);
									const modelEndpoint = workspaceSettings.get('modelEndpoint') as string;
									const modelName = workspaceSettings.get('modelName') as string;
									const modelVersion = workspaceSettings.get('modelApiVersion') as string;
									const useOllama = workspaceSettings.get('useOllama') as boolean;
									const documentationFilePath = workspacePathPrefix + sectionConfig.values.defaultDocumentFileName + defaultExtension;

									const documentation = await new DocuGen(secretProvider)
										.generateDocumentation(
											workspacePathPrefix,
											excludedItems,
											supportedExtensions,
											itemsToBeIncluded,
											documentationFilePath,
											modelEndpoint,
											modelName,
											modelVersion,
											useOllama
										);

									await writeToFile(documentation, documentationFilePath);

									vscode.commands.executeCommand('vscode.open', vscode.Uri.file(documentationFilePath));

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
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() { }

function validModelConfig(modelEndpoint: string, modelName: string, modelVersion: string, modelApiKey: string): boolean {
	if (modelApiKey === undefined || modelApiKey === '') {
		vscode.window.showErrorMessage("Please define model API key to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openSettings', extensionName + '.' + 'modelApiKey');
		return false;
	}
	if (modelEndpoint === undefined || modelEndpoint === '') {
		vscode.window.showErrorMessage("Please define model endpoint to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openSettings', extensionName + '.' + 'modelEndpoint');
		return false;
	}
	else if (!modelEndpoint.includes('https://')) {
		vscode.window.showErrorMessage("Please define a valid model endpoint to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openSettings', extensionName + '.' + 'modelEndpoint');
		return false;
	}
	if (modelName === undefined || modelName === '') {
		vscode.window.showErrorMessage("Please define model name to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openSettings', extensionName + '.' + 'modelName');
		return false;
	}
	if (modelVersion === undefined || modelVersion === '') {
		vscode.window.showErrorMessage("Please define model version to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openSettings', extensionName + '.' + 'modelApiVersion');
		return false;
	}

	return true;

}

async function writeToFile(content: string, filePath: string) {
	try {
		// Check if the directory exists
		if (!fs.existsSync(path.dirname(filePath))) {
			await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
		}
		console.log('Writing to file', filePath);
		await fs.promises.writeFile(filePath, content);
		console.log('Document generated successfully:', filePath);
	} catch (error) {
		throw error;
		// Handle the error appropriately, e.g., show a user-friendly message or retry the operation
	}
}

function excludeInvalidExtensions(files: string[]) {
	return files.filter(x => x !== undefined && path.extname(x) !== '');
}

export function excludeInvalidFilesAndFolder(files: string[]) {
	return files.filter(
		x =>
			x !== undefined && x !== '' && !x.includes(DocuGenConstants.excludedItems)
	)
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
function getItemsRecursively(excludedItems: string[], source: string, parent: string = ''): string[] {
	let itemsList: string[] = [];

	try {
		const items = fs.readdirSync(source);
		const filteredItems = removeDuplicates(items.filter(x => !excludedItems.includes(x)));
		for (const item of filteredItems) {
			// Exclude items starting with a dot ('.')
			if (
				!/^[A-Za-z0-9].*/.test(item) ||
				item.startsWith('.') ||
				item.startsWith('_')
			) {
				continue; // Skip items not starting with an alphabet or valid number
			}

			const fullPath = path.join(source, item);
			const relativePath = path.join(parent, item);

			if (fs.statSync(fullPath).isDirectory()) {
				// Add the directory to the list 
				itemsList.push(relativePath);

				// Recursively get subdirectories and files 
				itemsList = itemsList.concat(getItemsRecursively(excludedItems, fullPath, relativePath));
			} else {
				// Add the file to the list
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

function vsCodeConfigExists(filePath: string): boolean {

	try {
		const fileContents = fs.readFileSync(filePath).toString();
		if (fileContents.length > 0) {
			return JSON.parse(fileContents).map((x: any) => {
				if (x.name === Enums.VSCode) {
					return true;
				}
			});
		}

		return false;
	}
	catch (error) {
		return false;
	}
}

function readConfigFile(configFilePath: string): SectionConfig[] {
	if (fs.existsSync(configFilePath)) {
		const fileContents = fs.readFileSync(configFilePath, 'utf-8');
		return JSON.parse(fileContents);
	}
	else {
		return [];
	}
}

function updateConfigFile(filePath: string, section: SectionConfig) {
	if (section !== undefined) {
		if (fs.existsSync(filePath)) {
			const existingSectionsWithoutVSCode = readConfigFile(filePath).filter(x => x.name !== Enums.VSCode);
			existingSectionsWithoutVSCode.push(section);

			writeConfigFile(filePath, existingSectionsWithoutVSCode);
		}
		else {
			writeConfigFile(filePath, [section]);
		}
	}
	else {
		throw new Error("Section is undefined");
	}
}

function writeConfigFile(filePath: string, sections: SectionConfig[]) {
	if (sections !== undefined && sections.length > 0) {
		fs.writeFileSync(filePath, JSON.stringify(sections, null, 2), 'utf-8');
	}
	else {
		throw new Error("Sections are undefined");
	}
}

function getExcludedItems(excludedItems: string[] = DocuGenConstants.excludedItems.split(',')): string[] {
	if (excludedItems === undefined) {
		return DocuGenConstants.excludedItems.split(',');
	}

	return removeDuplicates(excludedItems.concat(DocuGenConstants.excludedItems.split(',')).filter(x => x.trim() !== ''));
}

function getUncheckedItems(uncheckedItems: string[] = []): string[] {
	if (uncheckedItems === undefined) {
		return [];
	}
	return removeDuplicates(uncheckedItems.filter(x => x.trim() !== ''));
}

function getSupportedExtensions(supportedExtensions: string[] = DocuGenConstants.supportedExtensions.split(',')): string[] {
	if (supportedExtensions === undefined) {
		return DocuGenConstants.supportedExtensions.split(',');
	}
	return removeDuplicates(supportedExtensions.concat(DocuGenConstants.supportedExtensions.split(',')).filter(x => x.trim() !== ''));
}

// Function to determine if a file extension should be excluded
function isSupportedExtFile(extension: string): boolean {
	return getSupportedExtensions().includes(extension);
}

function getSecretProvider() {
	return new VSCodeSecretProvider();
}
