import { SectionConfig } from "./models/SectionConfig";
import { DocuGenConfig } from "./models/DocuGenConfig";
import { InvalidSectionConfigError } from "./exceptions/exceptions";

export class ConfigProvider {
    private rootConfig: DocuGenConfig;

    constructor() {
        this.rootConfig = new DocuGenConfig();
    }

    getSection(sectionName: string): SectionConfig {
        const section = this.getSections().find(x=>x.name.toLowerCase() == sectionName.toLowerCase());
        if(!section) {
            throw new InvalidSectionConfigError(`Section ${sectionName} not found`);
        }

        else return section;
    }

    getSections(): SectionConfig[] {
        return this.rootConfig.sections;
    }
}