import * as path from 'path';
import * as fs from 'fs';
import { ISecretProvider } from './providers/ISecretProvider';
import { FileSection } from './models/FileSection';
import { Constants } from './constants';
import { Providers } from './providers';
import { Enums } from './enums';
import { SectionConfig } from './models/SectionConfig';

export class DocuGen {
  private ISecretProvider: ISecretProvider;

  constructor(ISecretProvider: ISecretProvider, configSectionName: Enums, workspacePath: string) {
    if (!ISecretProvider) {
      throw new Error('Secret provider is required');
    }
    if (!workspacePath) {
      throw new Error('Workspace path is empty')
    }

    this.ISecretProvider = ISecretProvider
  }

  async scanRepository(sectionConfig: SectionConfig, workspacePath: string, excludeItemsFilePaths: string[], excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: (string | undefined)[], documentFilePath: string) {
    try {
      console.log('Scanning repository:', workspacePath);
      const fileExists = await this.checkIfFileExists(workspacePath, documentFilePath);
      console.log('Document file exists:', fileExists);
      if (fileExists === false && itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
        const documentation = await this.generateDocumentation(workspacePath, itemsToBeIncludedFilePaths, sectionConfig);

        if (documentation.length > 0) {
          await this.writeToFile(workspacePath, documentation, documentFilePath);
        }
        else {
          throw new Error("Unable to generate documentation");
        }
      }
      else {
        // Read the file & split in sections based on '### File:' format
        let fileContent = await this.readDocumentationFileContent(workspacePath, documentFilePath);
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
                  updatedContent = await new Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), originalFileContent, sectionConfig);
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
        }

        // Write back the updated content to the file
        await this.writeToFile(workspacePath, fileContent, documentFilePath);
      }
    }
    catch (exception) {
      console.log("Error received -" + exception);
      throw exception;
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

  private async generateDocumentation(workspacePath: string, files: (string | undefined)[], sectionConfig: SectionConfig): Promise<string> {
    let documentation = '';
    documentation = await this.generateFileLevelDocumentation(workspacePath, files, sectionConfig);
    return documentation;
  }

  private async generateFileLevelDocumentation(workspacePath: string, files: (string | undefined)[], sectionConfig: SectionConfig): Promise<string> {
    let fileDocumentation = Constants.fileTitle;
    console.log('Generating documentation for files:', files);
    for (const file of this.excludeInvalidFiles(files)) {
      if (file !== undefined) {
        const filePath = path.join(workspacePath, file);
        console.log('Generating documentation for current file: ', filePath)
        const document = fs.readFileSync(filePath.trim(), 'utf8');

        console.log('file content:', document);
        // Generate a summary for each file's content
        const summary = await new Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), document, sectionConfig);

        console.log('Summary generated')
        fileDocumentation += this.formContentInFormat(file, summary);
      }
    }

    return fileDocumentation;
  }

  private excludeInvalidFiles(files: (string | undefined)[]) {
    return files.filter(x => x !== undefined && path.extname(x) !== '')
  }

  private getSummaryPrompt() {
    return `Summarize this code file. Breakdown the code & highlight explanation of each method or api using best formatting practices. Strictly do not share full code in output response. make sure to not make any assumption about the code & strictly stick to the content. DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.\n`;
  }


  private async writeToFile(workspaceFolder: string, content: string, documentFileName: string) {
    try {
      const filePath = path.join(workspaceFolder, documentFileName).trim();
      // Check if the directory exists
      if (!fs.existsSync(path.dirname(filePath))) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      }
      console.log('Writing to file', filePath);
      await fs.promises.writeFile(filePath, content);
      console.log('Document generated successfully:', filePath);
    } catch (error) {
      throw error;
      // Handle the error appropriately, e.g., show a user-friendly message or retry the operation
    }
  }

}