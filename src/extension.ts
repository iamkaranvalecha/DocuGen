// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { scanRepository } from './logic';
import * as fs from 'fs';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const scan = vscode.commands.registerCommand('docugen.scanRepository', async () => {
		const levels = ['File Level'];
		const level = await vscode.window.showQuickPick(levels, {
		  placeHolder: 'Select the level to document'
		});
		
		if (level) {
			let masterExcludeItemsList: string[] = [];
			let masterExcludeExtensionList: string[] = [];
			
			// Read .gitignore file if present & exclude the folders & extensions
			const gitIgnorePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath + '/.gitignore';
			let gitIgnoreContent = '';
			if (gitIgnorePath) {
				try {
					gitIgnoreContent = await vscode.workspace.fs.readFile(vscode.Uri.file(gitIgnorePath)).then(content => {
						return Buffer.from(content).toString();
					});
				} catch (error) {
					console.log('No .gitignore file found');
				}
			}

			// Create exclusion list based on .gitignore file
			masterExcludeItemsList = gitIgnoreContent.split('\n').filter(line => line.startsWith('/') || line.endsWith('/')).map(folder => folder.substring(1));
			masterExcludeExtensionList = gitIgnoreContent.split('\n').filter(line => line.startsWith('.')).map(ext => ext.trim());

			// Show user a quick pick with only folder list to exclude
			let items = await listAllFilesAndFoldersInWorkspace();
			
			// Show the files and folders in a QuickPick with multi-selection enabled
			const itemsToExcludeSelectedByUser = await vscode.window.showQuickPick(items.map(x=>x.formatted), {
				canPickMany: true,
				title: 'Select files and folders to exclude from document generation',
				placeHolder: 'Select files and folders to exclude from document generation'
			});

			const itemsToExclude: string[] = [];
			for (const item of itemsToExcludeSelectedByUser || []){
				var plainName = items.find((value) => value.formatted === item)?.plain;
				if (plainName) {
					itemsToExclude.push(plainName);
				}
			}

			for (const item of itemsToExclude) {
				masterExcludeItemsList.push(item);
			}
			
			// Ask User to exclude folder & extension
			const filesToShowFromWorkspaceFoldersPick = [];
			for (const folder of masterExcludeItemsList) {
				var findFiles = vscode.workspace.findFiles(folder + '/**/*');
				for (const file of (await findFiles).values()) {
					const fsPath = file?.fsPath;
					if(!itemsToExclude.includes(fsPath)){
						filesToShowFromWorkspaceFoldersPick.push(fsPath);
					}
				}
			}
			
			if (filesToShowFromWorkspaceFoldersPick.length > 0)
			{
				const workspaceExcludeExtensions = await vscode.window.showQuickPick(filesToShowFromWorkspaceFoldersPick, {
					canPickMany: true,
					placeHolder: 'Select the extension to exclude from generating documentation like .js, .css',
					title: 'Select the extension to exclude from generating documentation like .js, .css',
				});

				for (const extension of workspaceExcludeExtensions || []){
					masterExcludeExtensionList.push(extension);
				}
			}

		  	// Proceed with documentation generation based on the selected level
		  	scanRepository(level, masterExcludeItemsList, masterExcludeExtensionList);
		}
	  });
	
	  context.subscriptions.push(scan);

	  const createWorkspace = vscode.commands.registerCommand('docugen.createWorkspaceSettings', async () => {
		const vscodeFolder = vscode.workspace.workspaceFolders[0].uri.fsPath + '/.vscode';
		if (!fs.existsSync(vscodeFolder)) {
			fs.mkdirSync(vscodeFolder);
		}

		// Check if settings.json exists
		const settingsFilePath = vscodeFolder + '/settings.json';
		if (!fs.existsSync(settingsFilePath)) {
			fs.writeFileSync(settingsFilePath, '{}');
		}

	});
	context.subscriptions.push(createWorkspace);
}

// This method is called when your extension is deactivated
export function deactivate() {}

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
