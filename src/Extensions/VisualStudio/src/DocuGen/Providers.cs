using Newtonsoft.Json;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

public class Providers
{
    private readonly ISecretProvider _secretProvider;
    private readonly HttpClient _httpClient;

    public Providers(ISecretProvider secretProvider)
    {
        _secretProvider = secretProvider;
        _httpClient = new HttpClient();
    }

    public async Task<string> SendRequestToModelAsync(string prompt, string content, ModelProviderEnums modelProvider, string modelEndpoint, string modelName, string modelVersion)
    {
        switch (modelProvider)
        {
            case ModelProviderEnums.Ollama:
                return await UseOllamaAsync(prompt, content, modelEndpoint, modelName, modelVersion);
            case ModelProviderEnums.AzureOpenAI:
                return await UseAzureOpenAIAsync(prompt, content, modelEndpoint, modelName, modelVersion);
            default:
                throw new Exception($"Unsupported model provider: {modelProvider}");
        }
    }

    private async Task<string> UseOllamaAsync(string prompt, string content, string modelEndpoint, string modelName, string modelVersion)
    {
        var settings = new
        {
            endpoint = modelEndpoint,
            apikey = await _secretProvider.GetSecret("modelApiKey"),
            modelName = modelName
        };

        var requestBody = new
        {
            model = settings.modelName,
            num_gpu = 0,
            main_gpu = 0,
            stream = false,
            prompt = content,
            system = prompt
        };

        var response = await _httpClient.PostAsync($"{settings.endpoint}/api/generate", new StringContent(JsonConvert.SerializeObject(requestBody), Encoding.UTF8, "application/json"));
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }

    private async Task<string> UseAzureOpenAIAsync(string prompt, string content, string modelEndpoint, string modelName, string modelVersion)
    {
        var settings = new
        {
            endpoint = modelEndpoint,
            apiversion = modelVersion,
            model = modelName,
            apikey = await _secretProvider.GetSecret("modelApiKey")
        };

        var requestBody = new
        {
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = new[]
                    {
                        new { type = "text", text = prompt }
                    }
                },
                new
                {
                    role = "user",
                    content = new[]
                    {
                        new { type = "text", text = content }
                    }
                }
            }
        };

        _httpClient.DefaultRequestHeaders.Add("api-key", settings.apikey);

        var response = await _httpClient.PostAsync(
            $"{settings.endpoint}/openai/deployments/{settings.model}/chat/completions?api-version={settings.apiversion}",
            new StringContent(JsonConvert.SerializeObject(requestBody), Encoding.UTF8, "application/json")
        );
        
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }
}