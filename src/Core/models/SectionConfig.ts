export class SectionConfig {
    constructor() {
        this.name = '';
        this.values = {
            excludeItemsFilePaths: [],
            excludeExtensionsFilePaths: [],
            itemsToBeIncludedFilePaths: [],
            documentFilePath: '',
            useOllama: false,
            modelEndpoint: '',
            modelName: '',
            modelVersion: ''
        };
    }

    name: string;
    values: {
        excludeItemsFilePaths: string[];
        excludeExtensionsFilePaths: string[];
        itemsToBeIncludedFilePaths: string[];
        documentFilePath: string;
        useOllama: boolean;
        modelEndpoint: string;
        modelName: string;
        modelVersion: string;
    };
}