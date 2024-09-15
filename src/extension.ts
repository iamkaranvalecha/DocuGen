// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'; 
import { scanRepository } from './logic';
import { showFolderQuickPick } from './extension-experimental';
import path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const scan = vscode.commands.registerCommand('docugen.scanRepository', async () => {
		// Get the workspace configuration
		const config = vscode.workspace.getConfiguration('docugen');
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			const workspaceFsPath = workspaceFolder?.uri.fsPath;
			if (workspaceFsPath !== undefined) {
				const workspacePathPrefix = workspaceFsPath + "\\";
				const defaultDocumentFileNameSettingName = 'defaultDocumentFileName';
				const defaultDocumentFileNameConfig = config.get(defaultDocumentFileNameSettingName, 'DocuGen');
				const defaultDocumentFileName: string = defaultDocumentFileNameConfig;
				const defaultExtension: string = '.md';
				const defaultDocumentFileNamePath = workspacePathPrefix + defaultDocumentFileName + defaultExtension;
				const includedItemsSettingName: string = 'includedItems';
				const excludedItemsSettingName: string = 'excludedItems';
				const excludedExtensionsSettingName: string = 'excludedExtensions';

				let masterExcludeItemsList: string[] = config.get(excludedItemsSettingName, []);
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
				// config.update(excludedItemsSettingName, masterExcludeItemsList, vscode.ConfigurationTarget.Workspace)

				let masterExcludeExtensionList: string[] = config.get(excludedExtensionsSettingName, []);
				if (masterExcludeExtensionList.length > 0) {
					for (const item of ['.python', '.env']) {
						const itemPath = workspacePathPrefix + item
						if (item !== '' && !masterExcludeItemsList.includes(itemPath)) {
							masterExcludeExtensionList.push(itemPath)
						}
					}
				}
				else {
					for (const item of masterExcludeExtensionList) {
						if (item !== '' && !masterExcludeExtensionList.includes(item)) {
							const itemPath = workspacePathPrefix + item;
							masterExcludeExtensionList.push(itemPath);
						}
					}
				}
				// config.update(excludedExtensionsSettingName, masterExcludeExtensionList, vscode.ConfigurationTarget.Workspace);

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
							.filter(line => line.trim().startsWith('/') || line.trim().endsWith('/'))
							.map(folder => folder.trim())
							.filter(folder => !masterExcludeExtensionList.includes(folder.trim()));

						// Remove duplicates by converting to a Set
						for (const item of gitExcludeItemsList) {
							if (!masterExcludeItemsList.includes(item.trim()))
								masterExcludeItemsList.push(item.trim());
						}

						const gitExcludeExtensionList = gitIgnoreContent.split('\n').filter(line => line.trim().startsWith('.')).map(ext => ext.trim());

						for (const item of gitExcludeExtensionList) {
							if (!masterExcludeExtensionList.includes(item.trim()))
								masterExcludeExtensionList.push(item.trim());
						}
					} catch (error) {
						console.log('No .gitignore file found');
					}
				}

				// Show user a quick pick with only folder list to exclude
				// let items = await listAllFilesAndFoldersInWorkspace();

				var quickPick = await vscode.window.createQuickPick();
				quickPick.title = 'Select files and folders to exclude from document generation';
				quickPick.placeholder = 'Exclude files and folders to exclude from document generation';
				quickPick.ignoreFocusOut = true;
				quickPick.step = 1
				quickPick.totalSteps = 2;
				// Get all directories and files recursively 
				const items = getItemsRecursively(workspaceFsPath); 
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
				let matchingItems: vscode.QuickPickItem[] = []
				quickPick.items.forEach((item) => {
					if (item.description?.trim() === masterExcludeItemsList.find(x => x === item.description?.trim())) {
						matchingItems.push(item)
					}
				});

				quickPick.selectedItems = matchingItems;  // Pre-select the item(s)
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
					if (selectedItems.length > 0) {
						for (const item of selectedItems || []) {
							if (item) {
								if (!masterExcludeItemsList.includes(item.description))
									masterExcludeItemsList.push(item.description);
							}
						}

						quickPick.step = 2;
						const workspaceExcludeExtensions = await vscode.window.showInputBox({
							validateInput(value) {
								if (value.length != 0) {
									var splitValue = value.split(',');
									for (const value of splitValue) {
										var trimmedValue = value.trim();
										if (!trimmedValue.startsWith('.')) {
											return 'Please type comma-separated extensions like .css, .html, .md';
										}
									}
								}
							},
							ignoreFocusOut: true,
							placeHolder: 'Please type comma-separated to exclude specific extensions like .js, .css',
							title: 'Exclude specific extensions from generating documentation',
						});

						for (const extension of workspaceExcludeExtensions?.split(',') || []) {
							if (extension !== '' && !masterExcludeExtensionList.includes(extension.trim())) {
								masterExcludeExtensionList.push(extension.trim());
							}
						}

						let itemsToBeIncluded = excludeInvalidFiles(quickPick.items.filter(item => !selectedItems.includes(item)).map(item => item.description));
						let updateExcludeListAgainstSelectionOfUser = masterExcludeItemsList.filter(item => {
							if (!itemsToBeIncluded.includes(item)) {
								return item;
							}
						});

						config.update(includedItemsSettingName, removeDuplicates(itemsToBeIncluded), vscode.ConfigurationTarget.Workspace);
						config.update(excludedItemsSettingName, removeDuplicates(updateExcludeListAgainstSelectionOfUser), vscode.ConfigurationTarget.Workspace);
						config.update(excludedExtensionsSettingName, removeDuplicates(masterExcludeExtensionList), vscode.ConfigurationTarget.Workspace);

						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification, // Show as a notification
							title: "Generating Documentation using DocuGen", // Title of the progress notification
						}, async (progress, token) => {
							try {
								// Simulate showing initial progress
								progress.report({ message: "Scanning repository for files..." });

								await scanRepository(workspaceFolder, updateExcludeListAgainstSelectionOfUser, masterExcludeExtensionList, itemsToBeIncluded, defaultDocumentFileNamePath, progress);

								// Notify the user with the result of the operation
								progress.report({ message: "Please verify the documentation" });

							} catch (error) {
								// Handle errors if the method throws an exception
								vscode.window.showErrorMessage(`An error occurred: ${error}`);
							}
						});
					}
					else {
						vscode.window.showInformationMessage('No item selected.');
					}

					quickPick.dispose();  // Always dispose of the quickPick once done.
				});

				quickPick.show();
			}
		}
	});

	context.subscriptions.push(scan);


	context.subscriptions.push(vscode.commands.registerCommand('docugen.treeview', () => {
        // Start by fetching the workspace folder structure
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            showFolderQuickPick(rootPath);
        } else {
            vscode.window.showErrorMessage("No workspace folder is open.");
        }
    }));

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
        for (const item of items) { 
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
                // Exclude non-standard file types
                if (isSupportedExtFile(ext)) {
                    // Add the file to the list 
                    itemsList.push(relativePath); 
                }
            }
        } 
    } catch (err) { 
        vscode.window.showErrorMessage(`Error reading directories: ${err}`); 
    } 
     
    return itemsList; 
} 

// Function to determine if a file extension should be excluded
function isSupportedExtFile(extension: string): boolean {
    const supportedExtensions =[
        ".js",
        ".ts",
        ".json",
        ".html",
        ".css",
        ".less",
        ".scss",
        ".vue",
        ".jsx",
        ".tsx",
        ".py",
        ".ipynb",
        ".yaml",
        ".yml",
        ".java",
        ".xml",
        ".properties",
        ".c",
        ".cpp",
        ".h",
        "Makefile",
        ".cs",
        ".config",
        ".rb",
        ".gemspec",
        ".gemfile",
        ".rake",
        ".php",
        ".swift",
        ".plist",
        ".kt",
        ".m",
        ".bat",
        ".ps1",
        "Dockerfile",
        ".tf"
      ];
    return supportedExtensions.includes(extension);
}

async function getAllFilesAndFolders(folderUri: vscode.Uri, prefix = '  ') {
	let items: { formatted: string, plain: string }[] = [];

	// Read the directory entries using vscode.workspace.fs
	const folderEntries = await vscode.workspace.fs.readDirectory(folderUri);

	for (const [name, type] of folderEntries) {
		const itemUri = vscode.Uri.joinPath(folderUri, name);

		// Skip .vscode folder, *.code-workspace files, or any other exclusions
		if (name === '.vscode' || name.endsWith('.code-workspace')) {
			continue; // Skip workspace-specific files and settings
		}

		// Add folders and files with appropriate indentation
		if (type === vscode.FileType.Directory) {
			// Add folder with `/` at the end and recurse for its contents
			const itemName = `${name}`;
			const formattedFolder = `${prefix}├── ${itemName}/`;
			const fileUri = vscode.Uri.parse(itemUri.toString())
			const filePath = fileUri.fsPath;
			items.push({ formatted: formattedFolder, plain: filePath });

			// Recursively get subfolders and files, with increased indentation
			const subItems = await getAllFilesAndFolders(itemUri, `${prefix}│   `);
			items = items.concat(subItems);
		} else if (type === vscode.FileType.File) {
			// Add files with the current level of indentation
			const itemName = `${name}`;
			const formattedFile = `${prefix}├── ${itemName}`;
			const fileUri = vscode.Uri.parse(itemUri.toString())
			const filePath = fileUri.fsPath;
			items.push({ formatted: formattedFile, plain: filePath });
		}
	}

	return items;
}

// Main function to display folders and files in a QuickPick with multi-selection enabled
async function listAllFilesAndFoldersInWorkspace() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	let allItems: { formatted: string, plain: string }[] = [];
	if (workspaceFolders) {

		// Collect all folders and files from each workspace folder
		for (const workspaceFolder of workspaceFolders) {
			const folderUri = workspaceFolder.uri;

			// Collect all subfolders and files, with indentation
			const subItems = await getAllFilesAndFolders(folderUri, '    ');
			allItems = allItems.concat(subItems); // Add subfolders and files
		}
	}

	return allItems;
}
