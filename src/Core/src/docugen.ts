import * as path from 'path';
import * as fs from 'fs';
import { ISecretProvider } from './providers/ISecretProvider';
import { FileSection } from './models/FileSection';
import { Constants } from './constants';
import { Providers } from './providers';

export class DocuGen {
  private ISecretProvider: ISecretProvider;

  constructor(ISecretProvider: ISecretProvider) {
    if (!ISecretProvider) {
      throw new Error('Secret provider is required');
    }

    this.ISecretProvider = ISecretProvider
  }

  async generateDocumentation(
    workspacePath: string,
    excludeItemsFilePaths: string[],
    excludeExtensionsFilePaths: string[],
    itemsToBeIncludedFilePaths: string[],
    documentationFilePath: string,
    modelEndpoint: string,
    modelName: string,
    modelVersion: string,
    useOllama: boolean): Promise<string> {
    try {
      console.log('Scanning repository:', workspacePath);
      const fileExists = await this.checkIfFileExists(workspacePath, documentationFilePath);
      console.log('Document file exists:', fileExists);
      let documentation = '';
      if (fileExists === false && itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
        documentation = await this.generateDocumentationForFiles(workspacePath, itemsToBeIncludedFilePaths, useOllama, modelEndpoint, modelName, modelVersion);
      }
      else if (itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
        documentation = await this.updateExistingDocumentation(workspacePath, documentationFilePath, excludeExtensionsFilePaths, itemsToBeIncludedFilePaths, useOllama, modelEndpoint, modelName, modelVersion);
      }
      else{
        throw new Error("No files to be included in documentation.");
      }

      if (documentation.length > 0) {
        return documentation;
      }
      else {
        throw new Error("Unable to generate documentation");
      }
    }
    catch (exception) {
      console.log("Error received -" + exception);
      throw exception;
    }
  }

  private async updateExistingDocumentation(workspacePath: string, documentationFilePath: string, excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: string[], useOllama: boolean, modelEndpoint: string, modelName: string, modelVersion: string) {
    // Read the file & split in sections based on '### File:' format
    let fileContent = await this.readDocumentationFileContent(workspacePath, documentationFilePath);
    if (!fileContent) {
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
        let filePath = '';
        let content = '';
        if (match) {
          filePath = match[1].trim(); // Extract the file path
          content = match[2].trim(); // Extract the content after the file path
        }
        else {
          filePath = section.split(Constants.newLine)[0].trim();
          content = section.split(filePath)[1].trim();
        }

        const fileName = this.getFileNameFromPath(filePath);

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

      // Handle files to be added if not already present
      for (const item of this.excludeInvalidFiles(itemsToBeIncludedFilePaths)) {
        if (item !== undefined && !crossCheckSectionsAgainstIncludedItems.some(x => x.filePath === item)) {
          crossCheckSectionsAgainstIncludedItems.push({
            fileName: this.getFileNameFromPath(item),
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
          const originalFileContent = await this.readFileContent(workspacePath + filePath);
          if (originalFileContent.length > 0) {
            let updatedContent = '';
            try {
              updatedContent = await new Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), originalFileContent, useOllama, modelEndpoint, modelName, modelVersion);
            }
            catch (error) {
              console.log(error);
              updatedContent = "`Unable to generate documentation. Please try again later.`"
            }
            if (updatedContent.length > 0) {
              let finalContent = this.formContentInFormat(filePath, updatedContent)
              if (appendAtEnd) {
                // Append new content to the end if not present
                fileContent += finalContent;
              } else {
                const filePathIndex = fileContent.indexOf(this.formFilePathWithPrefix(filePath)); // Index of the start of the file path
                const contentStartIndex = filePathIndex; // Index of the start of the content
                const contentEndIndex = (fileContent.indexOf(Constants.prefix + section) + section.length) + Constants.suffix.length + 1; // End index

                if (contentStartIndex === -1 || contentEndIndex === -1) {
                  continue; // Skip if section boundaries are invalid
                }

                // Replace the old content in the section
                fileContent = fileContent.slice(0, contentStartIndex) +
                  finalContent +
                  fileContent.slice(contentEndIndex);
              }
            }
            else {
              throw new Error("Unable to generate documentation");
            }
          }
        }
      }

      return fileContent;
    }
  }

  private formFilePathWithPrefix(filePath: string) {
    return `${Constants.prefix}${Constants.space}${filePath}`
  }

  private formContentInFormat(filePath: string, content: string) {
    return `${this.formFilePathWithPrefix(filePath)}${Constants.newLine}${content}${Constants.suffix}`
  }

  private getFileNameFromPath(filePath: string) {
    try {
      const fileName = path.basename(filePath);
      return fileName;
    }
    catch (error) {
      throw error;
    }
  }

  private async readFileContent(filePath: string) {
    try {
      const data = await fs.promises.readFile(filePath.trim(), 'utf8');
      return data;
    }
    catch (error) {
      throw error;
    }
  }
  private async readDocumentationFileContent(workspaceFolder: string, filePath: string) {
    try {
      filePath = path.join(workspaceFolder, filePath);
      console.log('Reading file:', filePath);
      const data = await fs.promises.readFile(filePath.trim(), 'utf8');
      return data;
    }
    catch (error) {
      throw error;
    }
  }


  private async checkIfFileExists(workspaceFolder: string, filePath: string): Promise<boolean> {

    try {
      filePath = path.join(workspaceFolder, filePath);
      await fs.promises.readFile(filePath.trim());
      return true;
    } catch (error) {
      return false;
    }
  }

  private async generateDocumentationForFiles(workspacePath: string, files: string[], useOllama: boolean, modelEndpoint: string, modelName: string, modelVersion: string): Promise<string> {
    let fileDocumentation = Constants.fileTitle;
    console.log('Generating documentation for files:', files);
    for (const file of this.excludeInvalidFiles(files)) {
      if (file !== undefined) {
        const filePath = path.join(workspacePath, file);
        console.log('Generating documentation for current file: ', filePath)
        const document = fs.readFileSync(filePath.trim(), 'utf8');

        console.log('file content:', document);
        // Generate a summary for each file's content
        const summary = await new Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), document, useOllama, modelEndpoint, modelName, modelVersion);

        console.log('Summary generated')
        fileDocumentation += this.formContentInFormat(file, summary);
      }
    }

    return fileDocumentation;
  }

  private excludeInvalidFiles(files: string[]) {
    return files.filter(x => x !== undefined && path.extname(x) !== '')
  }

  private getSummaryPrompt() {
    return `Summarize this code file. Breakdown the code & highlight explanation of each method or api using best formatting practices. Strictly do not share full code in output response. make sure to not make any assumption about the code & strictly stick to the content. DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.\n`;
  }
}
