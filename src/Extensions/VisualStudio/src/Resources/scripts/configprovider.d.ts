import { SectionConfig } from "./models/SectionConfig";
import { DocuGenConfig } from "./models/DocuGenConfig";
import { Enums } from "./enums";
export declare class ConfigProvider {
    private rootConfig;
    constructor(workspacePath: string, defaultConfig: SectionConfig);
    getConfig(): DocuGenConfig;
    getSection(sectionName: Enums): SectionConfig;
    getSections(): SectionConfig[];
}
