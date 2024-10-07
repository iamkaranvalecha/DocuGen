import { ISecretProvider } from './providers/ISecretProvider';
export declare class DocuGen {
    private ISecretProvider;
    constructor(ISecretProvider: ISecretProvider);
    generateDocumentation(workspacePath: string, excludeItemsFilePaths: string[], excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: string[], documentationFilePath: string, modelEndpoint: string, modelName: string, modelVersion: string, useOllama: boolean): Promise<string>;
    private updateExistingDocumentation;
    private formFilePathWithPrefix;
    private formContentInFormat;
    private getFileNameFromPath;
    private readFileContent;
    private readDocumentationFileContent;
    private checkIfFileExists;
    private generateDocumentationForFiles;
    private excludeInvalidFiles;
    private getSummaryPrompt;
}
