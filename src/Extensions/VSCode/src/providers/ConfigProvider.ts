import { Constants, DocuGenConfig } from 'docugen';
import * as fs from 'fs';

export class ConfigProvider {

    private readConfigFile(workspacePath: string) : DocuGenConfig {
        return JSON.parse(fs.readFileSync(workspacePath + Constants.configFileName).toString());
    }

    getConfiguration(workspacePath: string) {
        return this.readConfigFile(workspacePath);
    }
}