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
            this.writeToConfigFile(this.sections);
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

    update(sectionName: Enums, settingName: SettingEnums, newValue: string) {
        const fileContents = fs.readFileSync(this.configFilePath, 'utf-8');
        let existingSections: SectionConfig[] = JSON.parse(fileContents);

        if (this.sections.filter(x => x.name == sectionName).length == 0) {
            let newSection = new SectionConfig(sectionName);
            newSection.values[settingName] = newValue;
            existingSections.push(newSection);
        }
        else {
            existingSections.map((x) => {
                if (x.name == sectionName) {
                    const existingValue: string = x.values[settingName];
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

    removeDuplicates(arr: string[]): string[] {
        return [...new Set(arr.filter(item => item.trim() !== ''))];
    }

    writeToConfigFile(sections: SectionConfig[]) {
        if(sections != undefined)
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