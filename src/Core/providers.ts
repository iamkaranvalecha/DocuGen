import { IModelProvider } from './interfaces/IModelProvider';
import { ISecretProvider } from './interfaces/ISecretProvider';
import axios from "axios";

export class Providers implements IModelProvider {
  private secretProvider: ISecretProvider;

  constructor(secretProvider: ISecretProvider) {
    this.secretProvider = secretProvider;
  }

  async sendRequestToModel(prompt: string, content: string, fileName: string) {

    let provider: any = await this.pickProviderBasedOnSetting();
    if (provider) {
      return this.useLocalOpenAI(prompt, content, fileName);
    }
    else {
      return this.useAzureOpenAI(prompt, content, fileName);
    }
  }

  async pickProviderBasedOnSetting() {
    const provider = await this.secretProvider.getSecret('model-selection');
    return provider;
  }

  /**
   * Use Local OpenAI Compliant API to generate summary
   *
   * @param {string} prompt
   * @param {string} content
   * @param {string} fileName
   * @return {*} 
   */
  async useLocalOpenAI(prompt: string, content: string, fileName: string) {
    let settings: any = {
      "endpoint": await this.secretProvider.getSecret('model-local-api-endpoint-url'),
      "apikey": await this.secretProvider.getSecret('model-local-api-endpoint-key'),
      "modelName": await this.secretProvider.getSecret('model-local-model-name'),
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
      console.log(response.data.response);
      return response.data.response;
    }
    catch (error) {
      console.log(error);
      return error;
    }
  }

  async useAzureOpenAI(prompt: string, content: string, fileName: string) {
    let settings = {
      "endpoint": await this.secretProvider.getSecret('model-azure-openai-model-api-endpoint'),
      "apiversion": await this.secretProvider.getSecret('model-azure-openai-model-api-version'),
      "model": await this.secretProvider.getSecret('model-azure-openai-model-name'),
      "apikey": await this.secretProvider.getSecret('model-azure-openai-model-api-endpoint-key'),
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
      console.log(error);
      return error;
    }
  }
}