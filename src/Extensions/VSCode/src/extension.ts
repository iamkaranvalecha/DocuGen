// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { DocuGen, Constants as DocuGenConstants, Enums, SectionConfig, ModelProviderEnums, FileContentProvider } from 'docugen';
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
				if (validModelConfig(modelEndpoint, modelName, modelVersion, modelApiKey)) {
					const workspacePathPrefix = workspaceFsPath + path.sep;
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

					const allFiles = getItemsRecursively(excludedItems, workspaceFsPath, supportedExtensions);
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
								title: "DocuGen AI",
								cancellable: true
							}, async (progress, token) => {
								// Initialize an empty temporary file
								const tempFilePath = workspacePathPrefix + 'docugen-temp.md';
								await fs.promises.writeFile(tempFilePath, '');

								const abortController = new AbortController();
								const abortSignal = abortController.signal;

								token.onCancellationRequested(async () => {
									console.log("User canceled the operation - Aborting...");
									abortController.abort(); // Signal all async tasks to abort
									await deleteTempFile(tempFilePath); // Clean up temporary resources
									return;
								});

								try {
									const workspaceSettings = vscode.workspace.getConfiguration(extensionName);
									const modelEndpoint = workspaceSettings.get('modelEndpoint') as string;
									const modelName = workspaceSettings.get('modelName') as string;
									const modelVersion = workspaceSettings.get('modelApiVersion') as string;
									const modelProvider = workspaceSettings.get('modelProvider') as ModelProviderEnums;
									const documentationFilePath = sectionConfig.values.defaultDocumentFileName + defaultExtension;
									const workspaceDocumentationFilePath = workspacePathPrefix + documentationFilePath;

									const tempFilePath = workspacePathPrefix + 'docugen-temp.md';
									await fs.promises.writeFile(tempFilePath, '');

									const docuGen = new DocuGen(secretProvider);
									const chunkFilePaths: string[] = [];

									for (const file of itemsToBeIncluded) {
										if (abortSignal.aborted) { return; }; // Stop immediately if aborted

										progress.report({ message: `Analyzing ${file}...` });

										for await (const chunk of docuGen.generateDocumentation(
											workspacePathPrefix,
											excludedItems,
											[file],
											modelEndpoint,
											modelName,
											modelVersion,
											modelProvider
										)) {
											if (abortSignal.aborted) { return; }; // Exit loop immediately if aborted

											progress.report({ message: `Documentation generated for ${chunk.filePath}` });

											if (chunk.content) {
												await appendToTempFile(tempFilePath, chunk.content);
											}
											chunkFilePaths.push(chunk.filePath);
										}
									}

									if (abortSignal.aborted) { return; }; // Final check before file update

									progress.report({ message: "Updating the documentation file" });
									const fileContentProvider = new FileContentProvider();
									await fileContentProvider.updateFileContent(
										workspaceDocumentationFilePath,
										tempFilePath,
										chunkFilePaths
									);

									await deleteTempFile(tempFilePath);

									sectionConfig.values.includedItems = "";
									sectionConfig.values.uncheckedItems = removeDuplicates(
										sectionConfig.values.uncheckedItems.split(',').concat(itemsToBeIncluded)
									).join();
									updateConfigFile(configFilePath, sectionConfig);

									vscode.commands.executeCommand('vscode.open', vscode.Uri.file(workspaceDocumentationFilePath));
									progress.report({ message: "Please verify the documentation" });

								} catch (error) {
									if (abortSignal.aborted) {
										console.log("Operation aborted by user.");
									} else {
										vscode.window.showErrorMessage(`DocuGen: ${error}`);
									}
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
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', extensionName + '.' + 'modelApiKey');
		return false;
	}
	if (modelEndpoint === undefined || modelEndpoint === '') {
		vscode.window.showErrorMessage("Please define model endpoint to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', extensionName + '.' + 'modelEndpoint');
		return false;
	}
	else if (!modelEndpoint || (!modelEndpoint.startsWith('http://') && !modelEndpoint.startsWith('https://'))) {
		vscode.window.showErrorMessage("Please define a valid model endpoint to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', extensionName + '.' + 'modelEndpoint');
		return false;
	}
	if (modelName === undefined || modelName === '') {
		vscode.window.showErrorMessage("Please define model name to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', extensionName + '.' + 'modelName');
		return false;
	}
	if (modelVersion === undefined || modelVersion === '') {
		vscode.window.showErrorMessage("Please define model version to generate documentation.");
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', extensionName + '.' + 'modelApiVersion');
		return false;
	}

	return true;

}

async function appendToTempFile(tempFilePath: string, content: string): Promise<void> {
	try {
		await fs.promises.appendFile(tempFilePath, content);
	} catch (error) {
		console.error('Error appending to temporary file:', error);
		throw error;
	}
}

async function deleteTempFile(tempFilePath: string): Promise<void> {
	try {
		if (fs.existsSync(tempFilePath)) {
			await fs.promises.unlink(tempFilePath);
		}
	} catch (error) {
		console.error('Error cleaning up temporary file:', error);
	}
}

async function checkIfFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.readFile(filePath.trim());
		return true;
	} catch (error) {
		return false;
	}
}

async function readFile(filePath: string): Promise<string> {
	try {
		return await fs.promises.readFile(filePath, 'utf8');
	} catch (error) {
		console.error('Error reading file:', error);
		throw error;
	}
}

async function updateDocumentationWithNewContent(content: string, filePath: string) {
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
	);
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
function getItemsRecursively(excludedItems: string[], source: string, supportedExtensions: string[], parent: string = ''): string[] {
	try {
		const items = fs.readdirSync(source);

		const filteredItems = removeDuplicates(items.filter(x => !excludedItems.includes(x)));

		return validateFiles(filteredItems, excludedItems, source, supportedExtensions, parent);
	} catch (err) {
		vscode.window.showErrorMessage(`Error reading directories: ${err}`);
	}
}

function validateFiles(filteredItems: string[], excludedItems: string[], source: string, supportedExtensions: string[], parent: string): string[] {

	let itemsList: string[] = [];
	for (const item of filteredItems) {
		// Exclude items starting with a dot ('.')
		if (
			!/^[A-Za-z0-9].*/.test(item) ||
			item.startsWith('.') ||
			item.startsWith('_')
		) {
			continue; // Skip items not starting with an alphabet or valid number
		}
		try {
			const fullPath = path.join(source, item);
			const relativePath = path.join(parent, item);

			if (fs.statSync(fullPath).isDirectory()) {
				// Add the directory to the list 
				itemsList.push(relativePath);

				// Recursively get subdirectories and files 
				itemsList = itemsList.concat(getItemsRecursively(excludedItems, fullPath, supportedExtensions, relativePath));
			} else {
				// Add the file to the list
				const ext = path.extname(item).toLowerCase();
				if (ext.length > 0) {
					// Exclude non-standard file types
					const isSupported = isSupportedExtFile(supportedExtensions, ext);
					if (isSupported === true) {
						// Add the file to the list 
						itemsList.push(relativePath);
					}
				}
			}
		}
		catch (error) {
			continue;
		}
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
function isSupportedExtFile(supportedExtensions: string[], extension: string): boolean {
	return getSupportedExtensions(supportedExtensions).includes(extension);
}

function getSecretProvider() {
	return new VSCodeSecretProvider();
}
