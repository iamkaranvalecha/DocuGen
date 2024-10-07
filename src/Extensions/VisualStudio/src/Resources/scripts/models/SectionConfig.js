"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionConfig = void 0;
const constants_1 = require("../constants");
class SectionConfig {
    constructor(name, defaultFileName, excludedItems, includedItems, uncheckedItems, supportedExtensions) {
        this.name = name;
        this.values = {
            defaultDocumentFileName: defaultFileName !== null && defaultFileName !== void 0 ? defaultFileName : constants_1.Constants.extensionName,
            includedItems: includedItems !== null && includedItems !== void 0 ? includedItems : "",
            excludedItems: excludedItems !== null && excludedItems !== void 0 ? excludedItems : constants_1.Constants.excludedItems,
            uncheckedItems: uncheckedItems !== null && uncheckedItems !== void 0 ? uncheckedItems : "",
            supportedExtensions: supportedExtensions !== null && supportedExtensions !== void 0 ? supportedExtensions : constants_1.Constants.supportedExtensions
        };
    }
}
exports.SectionConfig = SectionConfig;
//# sourceMappingURL=SectionConfig.js.map