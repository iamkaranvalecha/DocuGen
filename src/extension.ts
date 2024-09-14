// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { scanRepository } from './logic';
import * as fs from 'fs';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// // Use the console to output diagnostic information (console.log) and errors (console.error)
	// // This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "docugen" is now active!');

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('docugen.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from DocuGen!');
	// });

	// context.subscriptions.push(disposable);

	const scan = vscode.commands.registerCommand('docugen.scanRepository', async () => {
		const levels = ['Function Level', 'File Level', 'Folder Level'];
		const level = await vscode.window.showQuickPick(levels, {
		  placeHolder: 'Select the level to document'
		});
		
		if (level) {
		  // Proceed with documentation generation based on the selected level
		  scanRepository(level);
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
