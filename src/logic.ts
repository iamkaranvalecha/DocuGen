import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { FileSection } from './interfaces/FileSection';

export async function scanRepository(workspaceFolder: vscode.WorkspaceFolder, excludeItemsFilePaths: string[], excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: (string | undefined)[], documentFilePath: string, progress: vscode.Progress<{
  message?: string;
  increment?: number;
}>) {
  try {
    const workspaceFsPath = workspaceFolder.uri.fsPath;
    if (!workspaceFsPath) {
      vscode.window.showErrorMessage('No workspace folder found!');
      return;
    }

    const files: string[] = [];
    await traverseDirectory(workspaceFsPath, files, excludeItemsFilePaths, excludeExtensionsFilePaths);

    const fileExists = await checkIfFileExists(documentFilePath);
    if (fileExists === false && itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
      progress.report({ message: "Scanning completed. Analysing the code..." });
      const documentation = await generateDocumentation(itemsToBeIncludedFilePaths, progress);

      progress.report({ message: "Writing documentation to the file..." });
      await writeToFile(workspaceFsPath, documentation, documentFilePath);
    }
    else {
      // Read the file & split in sections based on '### File:' format
      let fileContent = await readFileContent(documentFilePath);
      if (!fileContent) {
        vscode.window.showErrorMessage('No content found in the file!');
        return;
      }

      if (itemsToBeIncludedFilePaths !== undefined) {
        // Split the file content by sections using regex for more precise matching
        let sections = fileContent.split(/### File:/);
        let crossCheckSectionsAgainstIncludedItems: FileSection[] = [];
        let filePathsInFile: string[] = [];

        for (let i = 1; i < sections.length; i++) {
          const section = sections[i];

          // Use regex to find section start and end
          const regex = /^(.*?\\[\w\s]+(?:\\[\w\s]+)*\.\w+)\n([\s\S]*)/;
          const match = regex.exec(section);
          if (match) {
            const filePath = match[1].trim(); // Extract the file path
            const content = match[2].trim(); // Extract the content after the file path
            const filePathIndex = match.index; // Index of the start of the file path
            const contentStartIndex = filePathIndex + match[1].length + 1; // Index of the start of the content (file path length + newline)
            const contentEndIndex = contentStartIndex + content.length; // End index of the content is the start index of the content + content length
            const fileName = getFileNameFromPath(filePath);

            if (contentStartIndex === -1 || contentEndIndex === -1) {
              continue; // Skip if section boundaries are invalid
            }

            // Track the file paths in the current content
            filePathsInFile.push(filePath);

            const isIncluded = itemsToBeIncludedFilePaths.includes(filePath) && !excludeExtensionsFilePaths.includes(filePath);

            crossCheckSectionsAgainstIncludedItems.push({
              fileName: fileName,
              filePath: filePath,
              section: section,
              toBeAnalysed: isIncluded,
              startIndex: contentStartIndex,
              endIndex: contentEndIndex,
              appendAtEnd: false
            });
          }
        }

        // Handle files to be added if not already present
        for (const item of excludeInvalidFiles(itemsToBeIncludedFilePaths)) {
          if (!crossCheckSectionsAgainstIncludedItems.some(x => x.filePath === item)) {
            crossCheckSectionsAgainstIncludedItems.push({
              fileName: getFileNameFromPath(item),
              filePath: item,
              section: '',
              toBeAnalysed: true,
              startIndex: -1,
              endIndex: -1,
              appendAtEnd: true
            });
          }
        }

        // Process each section and analyze or append content
        for (const item of crossCheckSectionsAgainstIncludedItems) {
          const { filePath, section, toBeAnalysed, appendAtEnd, startIndex } = item;

          if (toBeAnalysed) {
            const originalFileContent = await readFileContent(filePath);
            if (originalFileContent.length > 0) {
              // Analyze the content using the model (e.g., callLanguageModel)
              const updatedContent = await callLanguageModel(getSummaryPrompt(), originalFileContent, filePath, progress);
              let prefix = `\n### File: ${filePath}\n`
              let appendContent = `${updatedContent}\n\n----\n`;
              let finalContent = prefix + appendContent
              let endIndex = prefix.length+section.length
              if (appendAtEnd) {
                // Append new content to the end if not present
                fileContent += finalContent;
              } else {
                // Replace the old content in the section
                fileContent = fileContent.slice(0, startIndex) +
                  finalContent +
                  fileContent.slice(endIndex); // Adjust for '----' marker length
              }
            }
          }
        }
      }

      // Write back the updated content to the file
      await writeToFile(workspaceFsPath, fileContent, documentFilePath);
    }
  }
  catch (exception) {
    console.log("Error received -" + exception);
  }
}

function getFileNameFromPath(filePath: string) {
  try {
    const fileName = path.basename(filePath);
    return fileName;
  }
  catch (error) {
    throw error;
  }
}

async function readFileContent(filePath: string) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  }
  catch (error) {
    throw error;
  }
}

async function checkIfFileExists(filePath: string): Promise<boolean> {
  // Create a Uri for the file using the workspace folder and file name
  const fileUri = vscode.Uri.file(filePath);

  try {
    // Use fs.stat to check if the file exists
    await vscode.workspace.fs.readFile(fileUri);
    return true
  } catch (error) {
    return false
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
  let fileDocumentation = '### AI Generated Documentation using DocuGen\n----\n';

  for (const file of excludeInvalidFiles(files)) {
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();

    // Generate a summary for each file's content
    const summary = await callLanguageModel(getSummaryPrompt(), content, file, progress);
    // const summary = await callLocalLanguageModel(`Summarize the content of this file:\n`, content);

    fileDocumentation += `\n### File: ${file}\n${summary}\n\n----\n`;
  }

  return fileDocumentation;
}

function excludeInvalidFiles(files: string[]) {
  return files.filter(x => path.extname(x) !== '')
}

function getSummaryPrompt() {
  return `Summarize this code file. Explain each method using best formatting practices & make sure it is done well at the end as there will be content appended in further tasks. DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.\n`;
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
    throw error
  }
}

async function callLanguageModel(prompt: string, content: string, fileName: string, progress: vscode.Progress<{
  message?: string;
  increment?: number;
}>) {
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
    progress.report({ message: "Analysing file " + fileName + "..." });
    var response = await axios.request(options)
    return response.data.choices[0].message.content
  }
  catch (error) {
    console.log(error)
    throw error
  }
}

async function writeToFile(workspaceFolder: string, content: string, documentFileName: string) {
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found!');
    return;
  }

  await fs.promises.writeFile(documentFileName, content);
}
