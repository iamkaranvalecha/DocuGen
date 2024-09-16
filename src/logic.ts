import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { generateSummary } from './providers';
import { FileSection } from './interfaces/FileSection';
import { Constants } from './constants';

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

    const fileExists = await checkIfFileExists(documentFilePath);
    if (fileExists === false && itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
      progress.report({ message: "Scanning completed. Analysing the code..." });
      const documentation = await generateDocumentation(itemsToBeIncludedFilePaths, progress);

      progress.report({ message: "Writing documentation to the file..." });
      await writeToFile(documentation, documentFilePath);
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
        const format = '### File:';
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
            const fileName = getFileNameFromPath(filePath);

            // Track the file paths in the current content
            filePathsInFile.push(filePath);

            const isIncluded = itemsToBeIncludedFilePaths.includes(filePath) && !excludeExtensionsFilePaths.includes(filePath);

            crossCheckSectionsAgainstIncludedItems.push({
              fileName: fileName,
              filePath: filePath,
              section: section,
              toBeAnalysed: isIncluded,
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
              appendAtEnd: true
            });
          }
        }

        // Process each section and analyze or append content
        for (const item of crossCheckSectionsAgainstIncludedItems) {
          const { filePath, fileName, section, toBeAnalysed, appendAtEnd } = item;

          if (toBeAnalysed) {
            const originalFileContent = await readFileContent(filePath);
            if (originalFileContent.length > 0) {
              // Analyze the content using the model (e.g., callLanguageModel)
              const updatedContent = await generateSummary(getSummaryPrompt(), originalFileContent, fileName, progress);
              let finalContent = formContentInFormat(filePath, updatedContent)
              if (appendAtEnd) {
                // Append new content to the end if not present
                fileContent += finalContent;
              } else {
                const filePathIndex = fileContent.indexOf(format + " " + filePath); // Index of the start of the file path
                const contentStartIndex = filePathIndex; // Index of the start of the content
                const contentEndIndex = (fileContent.indexOf(format + section) + section.length) + Constants.suffix.length + 1; // End index

                if (contentStartIndex === -1 || contentEndIndex === -1) {
                  continue; // Skip if section boundaries are invalid
                }

                // Replace the old content in the section
                fileContent = fileContent.slice(0, contentStartIndex) +
                  finalContent +
                  fileContent.slice(contentEndIndex);
              }
            }
          }
        }
      }

      // Write back the updated content to the file
      await writeToFile(fileContent, documentFilePath);
    }
  }
  catch (exception) {
    console.log("Error received -" + exception);
  }
}

function formContentInFormat(filePath: string, content: string) {
  return `${Constants.prefix}${filePath}${Constants.newLine}${content}${Constants.suffix}`
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
  let fileDocumentation = Constants.fileTitle;

  for (const file of excludeInvalidFiles(files)) {
    const document = await vscode.workspace.openTextDocument(file);
    const content = document.getText();

    // Generate a summary for each file's content
    const summary = await generateSummary(getSummaryPrompt(), content, file, progress);

    fileDocumentation += formContentInFormat(file, summary);
  }

  return fileDocumentation;
}

function excludeInvalidFiles(files: string[]) {
  return files.filter(x => path.extname(x) !== '')
}

function getSummaryPrompt() {
  return `Summarize this code file. Highlight each method or api explanation using best formatting practices, Try to highlight references too & make sure to not make any assumption & strictly stick to the content & at the end there will be more content appended in further tasks. DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.\n`;
}


async function writeToFile(content: string, documentFileName: string) {
  await fs.promises.writeFile(documentFileName, content);
}
