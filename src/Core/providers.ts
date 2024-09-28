import { SectionConfig } from './models/SectionConfig';
import { ISecretProvider } from './providers/ISecretProvider';
import axios from "axios";

export class Providers {
  private secretProvider;

  constructor(secretProvider: ISecretProvider) {
    this.secretProvider = secretProvider;
  }

  async sendRequestToModel(prompt: string, content: string, config: SectionConfig) {

    if (config.values.useOllama) {
      return this.useLocalOpenAI(prompt, content, config);
    }
    else {
      return this.useAzureOpenAI(prompt, content, config);
    }
  }

  /**
   * Use Local OpenAI Compliant API to generate summary
   *
   * @param {string} prompt
   * @param {string} content
   * @param {string} fileName
   * @return {*} 
   */
  private async useLocalOpenAI(prompt: string, content: string, config: SectionConfig) {
    let settings: any = {
      "endpoint": config.values.modelEndpoint,
      "apikey": await this.secretProvider.getSecret('model-local-api-endpoint-key'),
      "modelName": config.values.modelName,
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

  private async useAzureOpenAI(prompt: string, content: string, config: SectionConfig) {
    let settings = {
      "endpoint": config.values.modelEndpoint,
      "apiversion": config.values.modelVersion,
      "model": config.values.modelName,
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