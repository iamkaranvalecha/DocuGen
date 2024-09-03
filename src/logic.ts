import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import AzureOpenAI from 'openai';
import axios from 'axios';

export async function scanRepository(level: string) {
  try{
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found!');
      return;
    }

    const files: string[] = [];
    await traverseDirectory(workspaceFolder, files, level);

    const documentation = await generateDocumentation(files, level);
    await writeToFile(documentation);
  }
  catch(exception)
  {
    console.log("Error received -" + exception)
  }
}

async function traverseDirectory(dir: string, files: string[], level: string) {
  const items = await fs.promises.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.promises.stat(fullPath);

    if (stat.isDirectory()) {
      if (level === 'Folder Level') {
        // At Folder Level, summarize this folder's content
        files.push(fullPath);
      }
      await traverseDirectory(fullPath, files, level);
    } else if (stat.isFile()) {
      if (level === 'File Level' || level === 'Function Level') {
        files.push(fullPath);
      }
    }
  }
}

async function generateDocumentation(files: string[], level: string): Promise<string> {
  let documentation = '';

  switch (level) {
    case 'Function Level':
      documentation = await generateFunctionLevelDocumentation(files);
      break;
    case 'File Level':
      documentation = await generateFileLevelDocumentation(files);
      break;
    case 'Folder Level':
      documentation = await generateFolderLevelDocumentation(files);
      break;
    default:
      throw new Error(`Unknown documentation level: ${level}`);
  }

  return documentation;
}

async function generateFunctionLevelDocumentation(files: string[]): Promise<string> {
  let functionDocumentation = '### Function Level Documentation\n';
  
  for (const file of files) {
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();

    // Simple regex to extract function names for common languages (JavaScript, Python, etc.)
    const functionRegex = /(function\s+|def\s+|const\s+.+\s*=\s*\(?\s*function\s*\(?|async\s+function\s+|public\s+.+\s+\w+\s*\(|private\s+.+\s+\w+\s*\(|protected\s+.+\s+\w+\s*\()/g;
    const matches = content.match(functionRegex);

    functionDocumentation += `\n#### File: ${file}\n`;

    if (matches) {
      matches.forEach(match => {
        functionDocumentation += `- ${match.trim()}\n`;
      });
    } else {
      functionDocumentation += '- No functions found.\n';
    }
  }

  return functionDocumentation;
}

async function generateFileLevelDocumentation(files: string[]): Promise<string> {
  let fileDocumentation = '### File Level Documentation\n';
  
  for (const file of files) {
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();

    // Generate a summary for each file's content
    // const summary = await callLanguageModel(`Summarize the content of this file:\n${content}`, '');
    const summary = await callLocalLanguageModel(`Summarize the content of this file:\n`, content);
    fileDocumentation += `\n#### File: ${file}\n${summary}\n`;
  }

  return fileDocumentation;
}

async function generateFolderLevelDocumentation(files: string[]): Promise<string> {
  let folderDocumentation = '### Folder Level Documentation\n';
  const folderMap: { [key: string]: string[] } = {};

  // Organize files by folder
  files.forEach(file => {
    const folder = path.dirname(file);
    if (!folderMap[folder]) {
      folderMap[folder] = [];
    }
    folderMap[folder].push(file);
  });

  for (const folder in folderMap) {
    folderDocumentation += `\n#### Folder: ${folder}\n`;

    for (const file of folderMap[folder]) {
      const document = await vscode.workspace.openTextDocument(file);
      const content = document.getText();
      const summary = await callLanguageModel(`Summarize the content of this file:\n${content}`, '');
      folderDocumentation += `- **File:** ${path.basename(file)}\n  - ${summary}\n`;
    }
  }

  return folderDocumentation;
}

async function callLocalLanguageModel(prompt: string, content: string) {
  var options = {
    method: 'POST',
    url: 'https://gpt.amitk.in/api/generate',
    // params: {'api-version': '2024-04-01-preview'},
    headers: { 'api-key': 'ollama' },
    data: {
      model: 'gemma2:9b',
      num_gpu : 0,
      main_gpu: 0,
      stream: false,
      prompt: content,
      system: prompt
    }
  };
  
  try{
    var response = await axios.request(options)
    console.log(response.data.response)
    return response.data.response
  }
  catch(error){
    console.log(error)
    return error
  }
}

async function callLanguageModel(prompt: string, content: string) {
  var options = {
    method: 'POST',
    url: 'https://vsmodel.openai.azure.com/openai/deployments/gpt-4o-completions/chat/completions',
    params: {'api-version': '2024-04-01-preview'},
    headers: {'api-key': ''},
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
        {role: 'user', content: [{type: 'text', text: content}]}
      ]
    }
  };
  
  try{
    var response = await axios.request(options)
    return response.data.choices[0].message.content
  }
  catch(error){
    console.log(error)
    return error
  }
}

async function writeToFile(content: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found!');
    return;
  }

  const outputFilePath = path.join(workspaceFolder, 'documentation.md');
  await fs.promises.writeFile(outputFilePath, content);
  vscode.window.showInformationMessage(`Documentation generated and saved to ${outputFilePath}`);
}
