import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { generateSummary } from './providers';

export async function scanRepository(workspaceFolder: string, excludeItems: string[], excludeExtensions: string[], defaultDocumentFileName: string, progress: vscode.Progress<{
  message?: string;
  increment?: number;
}>) {
  try {
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found!');
      return;
    }

    const files: string[] = [];
    await traverseDirectory(workspaceFolder, files, excludeItems, excludeExtensions);

    progress.report({ message: "Scanning completed. Analysing the code..." });
    const documentation = await generateDocumentation(files, progress);

    progress.report({ message: "Writing documentation to the file..." });
    await writeToFile(documentation, defaultDocumentFileName);
  }
  catch (exception) {
    console.log("Error received -" + exception);
  }
}

async function traverseDirectory(dir: string, files: string[], excludeItems: string[], excludeExtensions: string[]) {
  const items = await fs.promises.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.promises.stat(fullPath);

    if (stat.isDirectory() && !excludeItems.includes(item)) {
      await traverseDirectory(fullPath, files, excludeItems, excludeExtensions);
    } else if (stat.isFile() && !excludeItems.includes(item)) {
      files.push(fullPath);
    }
  }
}

async function generateDocumentation(files: string[], progress: vscode.Progress<{
  message?: string;
  increment?: number;
}>): Promise<string> {
  let documentation = '';
  documentation = await generateFileLevelDocumentation(files, progress);
  return documentation;
}

async function generateFileLevelDocumentation(files: string[], progress: vscode.Progress<{
  message?: string;
  increment?: number;
}>): Promise<string> {
  let fileDocumentation = '### File Level Documentation\n';

  for (const file of files) {
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();

    // Generate a summary for each file's content
    const summary = await generateSummary(content,`Summarize the content of this file:\n`, file, progress);
    // const summary = await dispatch(`Summarize the content of this file:\n${content}`, '', file, progress);
    // const summary = await callLocalLanguageModel(`Summarize the content of this file:\n`, content);
    fileDocumentation += `\n#### File: ${file}\n${summary}\n`;
  }

  return fileDocumentation;
}



async function writeToFile(content: string, defaultDocumentFileName: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found!');
    return;
  }

  let outputFilePath = path.join(workspaceFolder, defaultDocumentFileName);
  const extension = '.md';
  outputFilePath += extension;

  await fs.promises.writeFile(outputFilePath, content);
}
