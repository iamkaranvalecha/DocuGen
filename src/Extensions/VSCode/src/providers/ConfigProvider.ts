import { Constants } from 'docugen';
import * as fs from 'fs';

export class ConfigProvider {

    private readConfigFile() {
        return fs.readFileSync(Constants.configFileName).toJSON()
    }

    getConfiguration() {
        return this.readConfigFile();
    }
}