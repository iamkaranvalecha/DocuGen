import * as fs from 'fs';
import { Constants } from "../constants";
import { SectionConfig } from "./SectionConfig"
import { ConfigNotFoundError } from '../exceptions/exceptions';

export class DocuGenConfig {
    constructor(rootDir:string) {
        const filePath = rootDir + Constants.configFileName;
        if (this.checkIfFileExists(filePath) == false) {
            this.sections = [];
            fs.writeFileSync(filePath, JSON.stringify(this.sections), 'utf-8');
        }
        else {
            const fileContents = fs.readFileSync(filePath, 'utf-8');
            this.sections = JSON.parse(fileContents);
        }
    }

    sections: SectionConfig[] = []

    private checkIfFileExists(filePath: string): boolean {

        try {
            fs.readFileSync(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
}