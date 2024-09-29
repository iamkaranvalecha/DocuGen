import * as fs from 'fs';
import { Constants } from "../constants";
import { SectionConfig } from "./SectionConfig"
import { Enums, SettingEnums } from '../enums';

export class DocuGenConfig {
    constructor(workspacePath: string, defaultConfig: SectionConfig) {
        const filePath = workspacePath + Constants.configFileName;
        this.configFilePath = filePath;
        if (this.checkIfFileExists(filePath) == false) {
            this.sections = [defaultConfig];
            this.writeConfigFile(this.sections);
        }
        else {
            const fileContents = fs.readFileSync(filePath, 'utf-8');
            this.sections = JSON.parse(fileContents);
        }
    }

    sections: SectionConfig[] = []
    configFilePath: string = '';

    get(sectionName: Enums, settingName: string, defaultValue: string): string {
        return this.sections.filter(x => x.name == sectionName)[0].values[settingName] ?? defaultValue;
    }

    update(sectionName: Enums, settingName: SettingEnums, value: string) {
        const fileContents = fs.readFileSync(this.configFilePath, 'utf-8');
        const existingSections: SectionConfig[] = JSON.parse(fileContents);

        if (this.sections.filter(x => x.name == sectionName).length == 0) {
            let newSection = new SectionConfig(sectionName);
            newSection.values[settingName] = value;
            existingSections.push(newSection);
        }
        else {
            existingSections.map((x) => {
                if (x.name == sectionName) {
                    const existingValue: string = x.values[settingName];
                    if (existingValue && existingValue.includes(','))
                        x.values[settingName] = [...new Set(existingValue.split(',').filter(x => x.trim() != "").concat(value))].join();
                    else
                        x.values[settingName] = value;
                }
            });
        }

        this.sections = existingSections;
        this.writeConfigFile(this.sections);
    }

    private writeConfigFile(sections: SectionConfig[]) {
        fs.writeFileSync(this.configFilePath, JSON.stringify(sections, null, 2), 'utf-8');
    }

    private checkIfFileExists(filePath: string): boolean {

        try {
            fs.readFileSync(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
}