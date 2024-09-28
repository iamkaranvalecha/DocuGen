// VSCodeSecretProvider.ts
import * as vscode from 'vscode';
import { ISecretProvider } from 'docugen';

export class VSCodeSecretProvider implements ISecretProvider {
    async getSecret(key: string): Promise<string | undefined> {
        return vscode.workspace.getConfiguration().get<string>(`yourExtension.secrets.${key}`);
    }
    getConfiguration(){
        return vscode.workspace.getConfiguration();
    }
}