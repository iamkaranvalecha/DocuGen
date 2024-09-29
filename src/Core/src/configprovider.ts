import { SectionConfig } from "./models/SectionConfig";
import { DocuGenConfig } from "./models/DocuGenConfig";
import { InvalidSectionConfigError } from "./exceptions";
import { Constants } from "./constants";
import { Enums } from "./enums";

export class ConfigProvider {
    private rootConfig: DocuGenConfig;

    constructor(workspacePath: string, defaultConfig: SectionConfig) {
        this.rootConfig = new DocuGenConfig(workspacePath, defaultConfig);
    }

    getConfig(): DocuGenConfig {
        return this.rootConfig;
    }

    getSection(sectionName: Enums): SectionConfig {
        const section = this.getSections().find(x => x.name.toLowerCase() == sectionName.toString().toLowerCase());
        if (!section) {
            throw new InvalidSectionConfigError(Constants.extensionName + ": " + `configuration section ${sectionName} not found`);
        }

        else return section;
    }

    getSections(): SectionConfig[] {
        return this.rootConfig.sections;
    }
}