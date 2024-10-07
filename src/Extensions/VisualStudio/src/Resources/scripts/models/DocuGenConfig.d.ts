import { SectionConfig } from "./SectionConfig";
import { Enums, SettingEnums } from '../enums';
export declare class DocuGenConfig {
    constructor(workspacePath: string, defaultConfig: SectionConfig);
    sections: SectionConfig[];
    configFilePath: string;
    get(sectionName: Enums, settingName: string, defaultValue: string): string;
    update(sectionName: Enums, settingName: SettingEnums, newValue: string): void;
    removeDuplicates(arr: string[]): string[];
    writeToConfigFile(sections: SectionConfig[]): void;
    private checkIfFileExists;
}
