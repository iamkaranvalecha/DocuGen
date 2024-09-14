// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { scanRepository } from './logic';

// Get the workspace configuration
const config = vscode.workspace.getConfiguration('docugen');

let defaultDocumentFileName: string = config.get('defaultDocumentFileName') ?? 'Documentation.md';
let includedItemsSettingName: string = 'includedItems';
let excludedItemsSettingName: string = 'excludedItems';
let excludedExtensionsSettingName: string = 'excludedExtensions';

let masterExcludeItemsList: string[] = ['node_modules', '.vscode', '.git', '.gitignore'];
let excludeItemConfig = config.get(excludedItemsSettingName, [])
console.log(typeof (excludeItemConfig))
for (const item of excludeItemConfig)
	if (item != '' && !masterExcludeItemsList.includes(item))
		masterExcludeItemsList.push(item)
config.update(excludedItemsSettingName, masterExcludeItemsList, vscode.ConfigurationTarget.Workspace)

let masterExcludeExtensionList: string[] = ['.python', '.env'];
let excludeExtensionListConfig = config.get(excludedExtensionsSettingName, [])
console.log(typeof (excludeExtensionListConfig))
for (const item of excludeExtensionListConfig)
	if (item != '' && !masterExcludeExtensionList.includes(item))
		masterExcludeExtensionList.push(item)
config.update(excludedExtensionsSettingName, masterExcludeExtensionList, vscode.ConfigurationTarget.Workspace)

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const scan = vscode.commands.registerCommand('docugen.scanRepository', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (workspaceFolder != undefined) {
			// Read .gitignore file if present & exclude the folders & extensions
			const gitIgnorePath = workspaceFolder + '/.gitignore';
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
			let items = await listAllFilesAndFoldersInWorkspace();

			var quickPick = await vscode.window.createQuickPick();
			quickPick.title = 'Select files and folders to exclude from document generation';
			quickPick.placeholder = 'Exclude files and folders to exclude from document generation';
			quickPick.ignoreFocusOut = true;
			quickPick.step = 1
			quickPick.totalSteps = 2;
			quickPick.items = items.map(x => {
				return {
					description: x.plain,
					label: x.formatted,
				} as vscode.QuickPickItem
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
			quickPick.onDidAccept(async () => {
				console.log('onDidAccept called')
				const selectedItems = quickPick.selectedItems;
				if (selectedItems.length > 0) {
					for (const item of selectedItems || []) {
						var plainName = items.find((value) => value.formatted === item.label)?.plain;
						if (plainName) {
							if (!masterExcludeItemsList.includes(plainName.trim()))
								masterExcludeItemsList.push(plainName.trim());
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
						if (extension != '' && !masterExcludeExtensionList.includes(extension.trim()))
							masterExcludeExtensionList.push(extension.trim());
					}

					var itemsToBeIncluded = quickPick.items.filter(item => !selectedItems.includes(item)).map(item => item.description);
					config.update(includedItemsSettingName, itemsToBeIncluded, vscode.ConfigurationTarget.Workspace)

					var updateExcludeListAgainstSelectionOfUser = masterExcludeItemsList.filter(item => {
						if (!itemsToBeIncluded.includes(item))
							return item
					})
					config.update(excludedItemsSettingName, updateExcludeListAgainstSelectionOfUser, vscode.ConfigurationTarget.Workspace)
					config.update(excludedExtensionsSettingName, masterExcludeExtensionList, vscode.ConfigurationTarget.Workspace)
				}
				else {
					vscode.window.showInformationMessage('No item selected.');
				}

				quickPick.dispose();  // Always dispose of the quickPick once done.

				// Proceed with documentation generation based on the selected level
				let excludeItemConfig = config.get(excludedItemsSettingName, [])
				let excludeExtensionListConfig = config.get(excludedExtensionsSettingName, [])
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification, // Show as a notification
					title: "Generating Documentation using DocuGen", // Title of the progress notification
				}, async (progress, token) => {
					try {
						// Simulate showing initial progress
						progress.report({ message: "Scanning repository for files..." });
						
						await scanRepository(workspaceFolder, excludeItemConfig, excludeExtensionListConfig, defaultDocumentFileName, progress);
						
						// Notify the user with the result of the operation
						progress.report({ message: "Please verify the documentation" });

					} catch (error) {
						// Handle errors if the method throws an exception
						vscode.window.showErrorMessage(`An error occurred: ${error}`);
					}
				});
			});

			quickPick.show();
		}

	});

	context.subscriptions.push(scan);
}

// This method is called when your extension is deactivated
export function deactivate() { }

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
			items.push({ formatted: formattedFolder, plain: itemName });

			// Recursively get subfolders and files, with increased indentation
			const subItems = await getAllFilesAndFolders(itemUri, `${prefix}│   `);
			items = items.concat(subItems);
		} else if (type === vscode.FileType.File) {
			// Add files with the current level of indentation
			const itemName = `${name}`;
			const formattedFile = `${prefix}├── ${itemName}`;
			items.push({ formatted: formattedFile, plain: itemName });
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
