export interface IDocuGen{
    scanRepository(workspaceFsPath: string, excludeItemsFilePaths: string[], excludeExtensionsFilePaths: string[], itemsToBeIncludedFilePaths: (string | undefined)[], documentFilePath: string): void;
}