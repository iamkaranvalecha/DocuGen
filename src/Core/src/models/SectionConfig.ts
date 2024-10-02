import { Constants } from "../constants";
import { Enums } from "../enums";

export class SectionConfig {
    constructor(name: Enums, defaultFileName: string, excludedItems: string, includedItems: string, uncheckedItems: string, supportedExtensions: string) {
        this.name = name;
        this.values = {
            defaultDocumentFileName: defaultFileName ?? Constants.extensionName,
            includedItems: includedItems ?? "",
            excludedItems: excludedItems ?? Constants.excludedItems,
            uncheckedItems: uncheckedItems ?? "",
            supportedExtensions: supportedExtensions ?? Constants.supportedExtensions
        };
    }

    name: Enums;
    values: {
        defaultDocumentFileName: string,
        includedItems: string;
        excludedItems: string;
        uncheckedItems: string,
        supportedExtensions: string;
    };
}