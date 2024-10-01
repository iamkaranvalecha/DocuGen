import { Constants } from "../constants";
import { Enums } from "../enums";

export class SectionConfig {
    constructor(name: Enums) {
        this.name = name;
        this.values = {
            defaultDocumentFileName: Constants.extensionName,
            includedItems: "",
            excludedItems: "",
            uncheckedItems: "",
            supportedExtensions: "",
            useOllama: false,
            modelEndpoint: '',
            modelName: '',
            modelVersion: ''
        };
    }

    name: Enums;
    values: {
        defaultDocumentFileName: string,
        includedItems: string;
        excludedItems: string;
        uncheckedItems: string,
        supportedExtensions: string;
        useOllama: boolean;
        modelEndpoint: string;
        modelName: string;
        modelVersion: string;
    };
}