"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigProvider = void 0;
const DocuGenConfig_1 = require("./models/DocuGenConfig");
const exceptions_1 = require("./exceptions");
const constants_1 = require("./constants");
class ConfigProvider {
    constructor(workspacePath, defaultConfig) {
        this.rootConfig = new DocuGenConfig_1.DocuGenConfig(workspacePath, defaultConfig);
    }
    getConfig() {
        return this.rootConfig;
    }
    getSection(sectionName) {
        const section = this.getSections().find(x => x.name.toLowerCase() == sectionName.toString().toLowerCase());
        if (!section) {
            throw new exceptions_1.InvalidSectionConfigError(constants_1.Constants.extensionName + ": " + `configuration section ${sectionName} not found`);
        }
        else
            return section;
    }
    getSections() {
        return this.rootConfig.sections;
    }
}
exports.ConfigProvider = ConfigProvider;
//# sourceMappingURL=configprovider.js.map