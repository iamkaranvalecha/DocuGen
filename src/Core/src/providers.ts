import { ISecretProvider } from './providers/ISecretProvider';
import axios from "axios";

export class Providers {
  private secretProvider;

  constructor(secretProvider: ISecretProvider) {
    this.secretProvider = secretProvider;
  }

  async sendRequestToModel(prompt: string, content: string, useOllama: boolean, modelEndpoint: string, modelName: string, modelVersion: string) {
    if (useOllama) {
      return this.useOllama(prompt, content, modelEndpoint, modelName, modelVersion);
    }
    else {
      return this.useAzureOpenAI(prompt, content, modelEndpoint, modelName, modelVersion);
    }
  }

  /**
   * Use Ollama Compliant API to generate summary
   *
   * @param {string} prompt
   * @param {string} content
   * @param {string} fileName
   * @return {*} 
   */
  private async useOllama(prompt: string, content: string, modelEndpoint: string, modelName: string, modelVersion: string) {
    let settings: any = {
      "endpoint": modelEndpoint,
      "apikey": await this.secretProvider.getSecret('modelApiKey'),
      "modelName": modelName,
    };
    var options = {
      method: 'POST',
      url: `${settings.endpoint}/api/generate`,
      headers: { 'api-key': settings.apikey },
      data: {
        model: settings.modelName,
        num_gpu: 0,
        main_gpu: 0,
        stream: false,
        prompt: content,
        system: prompt
      }
    };

    try {
      var response = await axios.request(options);
      return response.data.response;
    }
    catch (error) {
      throw error;
    }
  }

  private async useAzureOpenAI(prompt: string, content: string, modelEndpoint: string, modelName: string, modelVersion: string) {
    let settings = {
      "endpoint": modelEndpoint,
      "apiversion": modelVersion,
      "model": modelName,
      "apikey": await this.secretProvider.getSecret('modelApiKey'),
    };
    var options = {
      method: 'POST',
      url: `${settings.endpoint}/openai/deployments/${settings.model}/chat/completions`,
      params: { 'api-version': settings.apiversion },
      headers: { 'api-key': settings.apikey },
      data: {
        messages: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: prompt
              }
            ]
          },
          { role: 'user', content: [{ type: 'text', text: content }] }
        ]
      }
    };

    try {
      var response = await axios.request(options);
      return response.data.choices[0].message.content;
    }
    catch (error) {
      throw error;
    }
  }
}