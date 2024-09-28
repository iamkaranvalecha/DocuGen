export interface IDocuGenProvider {
    scanRepository(workspaceFsPath: string, excludeItemsFilePaths: string[], excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: (string | undefined)[], documentFilePath: string): void;
}