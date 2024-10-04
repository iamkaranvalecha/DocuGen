"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocuGenConfig = void 0;
const fs = __importStar(require("fs"));
const constants_1 = require("../constants");
const SectionConfig_1 = require("./SectionConfig");
class DocuGenConfig {
    constructor(workspacePath, defaultConfig) {
        this.sections = [];
        this.configFilePath = '';
        const filePath = workspacePath + constants_1.Constants.configFileName;
        this.configFilePath = filePath;
        if (this.checkIfFileExists(filePath) == false) {
            this.sections = [defaultConfig];
            this.writeToConfigFile(this.sections);
        }
        else {
            const fileContents = fs.readFileSync(filePath, 'utf-8');
            this.sections = JSON.parse(fileContents);
        }
    }
    get(sectionName, settingName, defaultValue) {
        var _a;
        return (_a = this.sections.filter(x => x.name == sectionName)[0].values[settingName]) !== null && _a !== void 0 ? _a : defaultValue;
    }
    update(sectionName, settingName, newValue) {
        const fileContents = fs.readFileSync(this.configFilePath, 'utf-8');
        let existingSections = JSON.parse(fileContents);
        if (this.sections.filter(x => x.name == sectionName).length == 0) {
            let newSection = new SectionConfig_1.SectionConfig(sectionName);
            newSection.values[settingName] = newValue;
            existingSections.push(newSection);
        }
        else {
            existingSections.map((x) => {
                if (x.name == sectionName) {
                    const existingValue = x.values[settingName];
                    if (existingValue && existingValue.includes(',')) {
                        const newValueArray = newValue.split(',').filter(x => x.trim() != "");
                        const uniqueValues = this.removeDuplicates(newValueArray);
                        x.values[settingName] = uniqueValues.join();
                    }
                    else
                        x.values[settingName] = newValue;
                }
            });
        }
        this.sections = existingSections;
        this.writeToConfigFile(this.sections);
    }
    removeDuplicates(arr) {
        return [...new Set(arr.filter(item => item.trim() !== ''))];
    }
    writeToConfigFile(sections) {
        if (sections != undefined)
            fs.writeFileSync(this.configFilePath, JSON.stringify(sections, null, 2), 'utf-8');
    }
    checkIfFileExists(filePath) {
        try {
            fs.readFileSync(filePath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.DocuGenConfig = DocuGenConfig;
//# sourceMappingURL=DocuGenConfig.js.map