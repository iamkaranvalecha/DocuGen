import { ISecretProvider } from './providers/ISecretProvider';
export declare class Providers {
    private secretProvider;
    constructor(secretProvider: ISecretProvider);
    sendRequestToModel(prompt: string, content: string, useOllama: boolean, modelEndpoint: string, modelName: string, modelVersion: string): Promise<any>;
    /**
     * Use Ollama Compliant API to generate summary
     *
     * @param {string} prompt
     * @param {string} content
     * @param {string} fileName
     * @return {*}
     */
    private useOllama;
    private useAzureOpenAI;
}
