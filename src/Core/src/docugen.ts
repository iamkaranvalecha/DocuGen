import * as path from 'path';
import * as fs from 'fs';
import { ISecretProvider } from './providers/ISecretProvider';
import { Constants } from './constants';
import { Providers } from './providers';
import { ModelProviderEnums } from './enums';
import { IDocumentationChunk } from './interfaces/IDocumentChunk';

export class DocuGen {
  private ISecretProvider: ISecretProvider;

  constructor(ISecretProvider: ISecretProvider) {
    if (!ISecretProvider) {
      throw new Error('Secret provider is required');
    }

    this.ISecretProvider = ISecretProvider;
  }

  async *generateDocumentation(
    workspacePath: string,
    excludeItemsFilePaths: string[],
    itemsToBeIncludedFilePaths: string[],
    modelEndpoint: string,
    modelName: string,
    modelVersion: string,
    modelProvider: ModelProviderEnums): AsyncGenerator<IDocumentationChunk> {
    try {
      console.log('Scanning repository:', workspacePath);

      if (!itemsToBeIncludedFilePaths?.length) {
        throw new Error("No files to be included in documentation.");
      }

      yield* this.generateDocumentationForFiles(workspacePath, itemsToBeIncludedFilePaths, modelProvider, modelEndpoint, modelName, modelVersion);
    }
    catch (exception) {
      console.log("Error received -" + exception);
      throw exception;
    }
  }

  private async *generateDocumentationForFiles(
    workspacePath: string,
    files: string[],
    modelProvider: ModelProviderEnums,
    modelEndpoint: string,
    modelName: string,
    modelVersion: string
  ): AsyncGenerator<IDocumentationChunk> {
    console.log('Generating documentation for files:', files);

    for (const file of this.excludeInvalidFiles(files)) {
      if (file) {
        const filePath = path.join(workspacePath, file);
        console.log('Generating documentation for current file: ', filePath);
        const document = fs.readFileSync(filePath.trim(), 'utf8');

        if (document.length > 0) {
          try {
            const summary = await new Providers(this.ISecretProvider)
              .sendRequestToModel(
                this.getSummaryPrompt(),
                document,
                modelProvider,
                modelEndpoint,
                modelName,
                modelVersion
              );

            yield {
              filePath: file,
              content: this.formContentInFormat(file, summary)
            };
          } catch (error) {
            console.error(`Error processing ${file}:`, error);
            yield { filePath: '', content: this.formContentInFormat(file, 'Unable to generate documentation! Please try again later.') };
          }
        }
      }
    }
  }

  // ... (rest of the utility methods remain the same)
  private formFilePathWithPrefix(filePath: string) {
    return `${Constants.prefix}${Constants.space}${filePath}`;
  }

  private formContentInFormat(filePath: string, content: string) {
    return `${this.formFilePathWithPrefix(filePath)}${Constants.newLine}${content}${Constants.suffix}`;
  }
  private excludeInvalidFiles(files: string[]) {
    return files.filter(x => x !== undefined && path.extname(x) !== '');
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