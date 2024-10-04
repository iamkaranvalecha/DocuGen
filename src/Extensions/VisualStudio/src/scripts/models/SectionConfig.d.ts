import { Enums } from "../enums";
export declare class SectionConfig {
    constructor(name: Enums, defaultFileName: string, excludedItems: string, includedItems: string, uncheckedItems: string, supportedExtensions: string);
    name: Enums;
    values: {
        defaultDocumentFileName: string;
        includedItems: string;
        excludedItems: string;
        uncheckedItems: string;
        supportedExtensions: string;
    };
}
