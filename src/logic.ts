import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

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
    const documentation = await generateDocumentation(files);
    
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

async function generateDocumentation(files: string[]): Promise<string> {
  let documentation = '';
  documentation = await generateFileLevelDocumentation(files);
  return documentation;
}

async function generateFileLevelDocumentation(files: string[]): Promise<string> {
  let fileDocumentation = '### File Level Documentation\n';

  for (const file of files) {
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();

    // Generate a summary for each file's content
    const summary = await callLanguageModel(`Summarize the content of this file:\n${content}`, '');
    // const summary = await callLocalLanguageModel(`Summarize the content of this file:\n`, content);
    fileDocumentation += `\n#### File: ${file}\n${summary}\n`;
  }

  return fileDocumentation;
}

async function callLocalLanguageModel(prompt: string, content: string) {
  var options = {
    method: 'POST',
    url: 'https://gpt.amitk.in/api/generate',
    // params: {'api-version': '2024-04-01-preview'},
    headers: { 'api-key': 'ollama' },
    data: {
      model: 'gemma2:9b',
      num_gpu: 0,
      main_gpu: 0,
      stream: false,
      prompt: content,
      system: prompt
    }
  };

  try {
    var response = await axios.request(options)
    console.log(response.data.response)
    return response.data.response
  }
  catch (error) {
    console.log(error)
    return error
  }
}

async function callLanguageModel(prompt: string, content: string) {
  var options = {
    method: 'POST',
    url: 'https://vsmodel.openai.azure.com/openai/deployments/gpt-4o-completions/chat/completions',
    params: { 'api-version': '2023-03-15-preview' },
    headers: { 'api-key': '' },
    data: {
      messages: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        },
        { role: 'user', content: [{ type: 'text', text: content }] }
      ]
    }
  };

  try {
    var response = await axios.request(options)
    return response.data.choices[0].message.content
  }
  catch (error) {
    console.log(error)
    return error
  }
}

async function writeToFile(content: string, defaultDocumentFileName: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found!');
    return;
  }

  const outputFilePath = path.join(workspaceFolder, defaultDocumentFileName);
  await fs.promises.writeFile(outputFilePath, content);
}
