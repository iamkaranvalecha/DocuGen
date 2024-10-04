"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = void 0;
const axios_1 = __importDefault(require("axios"));
class Providers {
    constructor(secretProvider) {
        this.secretProvider = secretProvider;
    }
    sendRequestToModel(prompt, content, useOllama, modelEndpoint, modelName, modelVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            if (useOllama) {
                return this.useOllama(prompt, content, modelEndpoint, modelName, modelVersion);
            }
            else {
                return this.useAzureOpenAI(prompt, content, modelEndpoint, modelName, modelVersion);
            }
        });
    }
    /**
     * Use Ollama Compliant API to generate summary
     *
     * @param {string} prompt
     * @param {string} content
     * @param {string} fileName
     * @return {*}
     */
    useOllama(prompt, content, modelEndpoint, modelName, modelVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            let settings = {
                "endpoint": modelEndpoint,
                "apikey": yield this.secretProvider.getSecret('modelApiKey'),
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
                var response = yield axios_1.default.request(options);
                return response.data.response;
            }
            catch (error) {
                throw error;
            }
        });
    }
    useAzureOpenAI(prompt, content, modelEndpoint, modelName, modelVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            let settings = {
                "endpoint": modelEndpoint,
                "apiversion": modelVersion,
                "model": modelName,
                "apikey": yield this.secretProvider.getSecret('modelApiKey'),
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
                var response = yield axios_1.default.request(options);
                return response.data.choices[0].message.content;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.Providers = Providers;
//# sourceMappingURL=providers.js.map