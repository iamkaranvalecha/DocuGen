export interface IModelProvider {
    sendRequestToModel(prompt: string, content: string, fileName: string): Promise<any>;
}