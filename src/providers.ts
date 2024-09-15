import axios from "axios";
import * as vscode from 'vscode';

export async function generateSummary(prompt: string, content: string, fileName: string, progress: vscode.Progress<{
    message?: string;
    increment?: number;
  }>) {

    let provider:any = await pickProviderBasedOnSetting();
    if(provider){
        return useLocalOpenAI(prompt, content, fileName, progress);
    }
    else{
        return useAzureOpenAI(prompt, content, fileName, progress);
    }
}

async function pickProviderBasedOnSetting(){
    const provider = await getGlobalSetting('docugen.model-selection') ;
    return provider;
}

/**
 * Gets the current value of a specific setting from user-level configuration.
 * @param {string} settingKey - The key of the setting to retrieve.
 */
async function getGlobalSetting(settingKey:string) {
    const configuration = vscode.workspace.getConfiguration();
    const value = configuration.get(settingKey);
    return value;
}

/**
 * Use Local OpenAI Compliant API to generate summary
 *
 * @param {string} prompt
 * @param {string} content
 * @param {string} fileName
 * @param {vscode.Progress<{
 *     message?: string;
 *     increment?: number;
 *   }>} progress
 * @return {*} 
 */
async function useLocalOpenAI(prompt: string, content: string, fileName: string, progress: vscode.Progress<{
    message?: string;
    increment?: number;
  }>) {
    let settings:any = {
        "endpoint": await getGlobalSetting('docugen.model-local-api-endpoint-url'),
        "apikey":await getGlobalSetting('docugen.model-local-api-endpoint-key'),
        "modelName":await getGlobalSetting('docugen.model-local-model-name'),
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
        progress.report({ message: "Analysing using "+settings.modelName+" file " + fileName + "..." });
        var response = await axios.request(options);
        console.log(response.data.response);
        return response.data.response;
    }
    catch (error) {
      console.log(error);
      return error;
    }
  }
  
  async function useAzureOpenAI(prompt: string, content: string, fileName: string, progress: vscode.Progress<{
    message?: string;
    increment?: number;
  }>) {
    let settings ={
        "endpoint": await getGlobalSetting('docugen.model-azure-openai-model-api-endpoint'),
        "apiversion": await getGlobalSetting('docugen.model-azure-openai-model-api-version'),
        "model": await getGlobalSetting('docugen.model-azure-openai-model-name'),
        "apikey": await getGlobalSetting('docugen.model-azure-openai-model-api-endpoint-key'),
    }
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
      progress.report({ message: "Analysing file " + fileName + "..." });
      var response = await axios.request(options);
      return response.data.choices[0].message.content;
    }
    catch (error) {
      console.log(error);
      return error;
    }
  }