// VSCodeSecretProvider.ts
import * as vscode from 'vscode';
import { ISecretProvider,Constants } from 'docugen';

export class VSCodeSecretProvider implements ISecretProvider {
    async getSecret(key: string): Promise<string | undefined> {
        return vscode.workspace.getConfiguration(Constants.extensionName.toLowerCase()).get(key);
    }
    getConfiguration(){
        return vscode.workspace.getConfiguration();
    }
}