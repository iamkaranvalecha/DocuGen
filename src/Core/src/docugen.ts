import * as path from 'path';
import * as fs from 'fs';
import { ISecretProvider } from './providers/ISecretProvider';
import { FileSection } from './models/FileSection';
import { Constants } from './constants';
import { Providers } from './providers';
import { ModelProviderEnums } from './enums';

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
    modelProvider: ModelProviderEnums): Promise<string> {
    try {
      console.log('Scanning repository:', workspacePath);
      const fileExists = await this.checkIfFileExists(workspacePath, documentationFilePath);
      console.log('Document file exists:', fileExists);
      let documentation = '';
      if (fileExists === false && itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
        documentation = await this.generateDocumentationForFiles(workspacePath, itemsToBeIncludedFilePaths, modelProvider, modelEndpoint, modelName, modelVersion);
      }
      else if (itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
        documentation = await this.updateExistingDocumentation(workspacePath, documentationFilePath, excludeExtensionsFilePaths, itemsToBeIncludedFilePaths, modelProvider, modelEndpoint, modelName, modelVersion);
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

  private async updateExistingDocumentation(workspacePath: string, documentationFilePath: string, excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: string[], modelProvider: ModelProviderEnums, modelEndpoint: string, modelName: string, modelVersion: string) {
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
              updatedContent = await new Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), originalFileContent, modelProvider, modelEndpoint, modelName, modelVersion);
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

  private async generateDocumentationForFiles(workspacePath: string, files: string[], modelProvider: ModelProviderEnums, modelEndpoint: string, modelName: string, modelVersion: string): Promise<string> {
    let fileDocumentation = Constants.fileTitle;
    console.log('Generating documentation for files:', files);
    for (const file of this.excludeInvalidFiles(files)) {
      if (file !== undefined) {
        const filePath = path.join(workspacePath, file);
        console.log('Generating documentation for current file: ', filePath)
        const document = fs.readFileSync(filePath.trim(), 'utf8');

        console.log('file content:', document);
        // Generate a summary for each file's content
        const summary = await new Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), document, modelProvider, modelEndpoint, modelName, modelVersion);

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
    return `Analyze the provided code snippet and generate a detailed, formatted summary that breaks down each method or API call. Please adhere to the following guidelines:
      Strictly do not share full code in output response. 
      make sure to not make any assumption about the code & strictly stick to the content. 
      DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.
      Code Organization: Organize the summary into logical sections, using clear headings and subheadings to separate each method or API call.
      Method/API Breakdown: For each method or API call, provide a concise summary (1-2 sentences) that explains its purpose, inputs, and outputs.
      Code Snippet: Include the relevant code snippet for each method or API call, formatted with syntax highlighting and proper indentation.
      Parameter Explanation: List and explain each parameter, including data types, default values, and any relevant constraints or assumptions.
      Return Values: Describe the return values, including data types and any relevant information about the returned data.
      Error Handling: If applicable, explain how errors are handled, including any error codes, messages, or exceptions that may be thrown.
      Context: Provide context for each method or API call, including any relevant dependencies, prerequisites, or assumptions.
      Best Practices: Highlight any best practices or coding standards used in the code, such as naming conventions, commenting, or testing.
      Assumptions: Avoid making any assumptions about the code or its intended use. Stick strictly to the content provided.
      Formatting: Use a clear, readable formatting style, with proper indentation, spacing, and syntax highlighting.
      Secret Scanning: Identify and exclude any sensitive information, such as API keys, passwords, or other secrets, from the summary. Replace any sensitive information with a placeholder, such as [SECRET].
      Exclusion of Explaining Secrets: Do not provide any explanation or description of the secrets or sensitive information identified in the code. Only indicate that a secret is present and provide a placeholder.
      Code Snippet:

      [Insert code snippet here]

      Additional Requirements:
      Use a consistent naming convention throughout the summary.
      Use clear, concise language, avoiding technical jargon or overly complex explanations.
      Include any relevant links to documentation, tutorials, or resources that may aid in understanding the code.
      If the code uses any external libraries or frameworks, provide a brief overview of their purpose and how they are used in the code.
      By following these guidelines, the expert code summarizer tool can provide a comprehensive, easy-to-understand summary of the code, highlighting each method or API call and explaining its purpose, inputs, and outputs in a clear and concise manner.\n`;
  }
}
