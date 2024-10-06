using EdgeJs;
using Newtonsoft.Json;
using System;
using System.Threading.Tasks;

namespace DocuGen.Integration
{
    public class EdgeJsIntegration
    {
        private Func<object, Task<object>> _jsFunction;

        public EdgeJsIntegration()
        {
            var edge = Edge.Func(@"
                return function (input, callback) {
                    var module = require('./scripts/index.js');
                    var result = {
                        DocuGen: module.DocuGen,
                        Providers: module.Providers,
                        Constants: module.Constants,
                        Enums: module.Enums,
                        SettingEnums: module.SettingEnums,
                        SectionConfig: module.SectionConfig,
                        ISecretProvider: module.ISecretProvider
                    };
                    callback(null, JSON.stringify(result));
                }
            ");

            _jsFunction = edge;
        }

        public async Task<TypeScriptTypes> GetTypesAsync()
        {
            var result = await _jsFunction(null);
            return JsonConvert.DeserializeObject<TypeScriptTypes>(result.ToString());
        }

        public async Task<string> GenerateDocumentationAsync(string workspacePath,
            string excludeItemsFilePaths,
            string excludeExtensionsFilePaths,
            string itemsToBeIncludedFilePaths,
            string documentationFilePath,
            string modelEndpoint,
            string modelName,
            string modelVersion,
            bool useOllama)
        {
            var edge = Edge.Func(@"
                return function (input, callback) {
                    var module = require('./scripts/index.js');
                    var docuGen = new module.DocuGen();
                    docuGen.generateDocumentation(
                        input.workspacePath,
                        input.excludeItemsFilePaths,
                        input.excludeExtensionsFilePaths,
                        input.itemsToBeIncludedFilePaths,
                        input.documentationFilePath,
                        input.modelEndpoint,
                        input.modelName,
                        input.modelVersion,
                        input.useOllama
                    ).then(result => {
                        callback(null, result);
                    }).catch(error => {
                        callback(error);
                    });
                }
            ");

            var input = new
            {
                workspacePath,
                excludeItemsFilePaths,
                excludeExtensionsFilePaths,
                itemsToBeIncludedFilePaths,
                documentationFilePath,
                modelEndpoint,
                modelName,
                modelVersion,
                useOllama
            };

            var result = await edge(input);
            return result.ToString();
        }
    }

    public class TypeScriptTypes
    {
        public DocuGen DocuGen { get; set; }
        public class Providers
        {
            // Define properties/methods based on your TypeScript Providers type
        }

        public class Constants
        {
            // Define properties based on your TypeScript Constants type
        }

        public class Enums
        {
            // Define enum properties based on your TypeScript Enums type
        }

        public class SettingEnums
        {
            // Define enum properties based on your TypeScript SettingEnums type
        }

        public class SectionConfig
        {
            // Define properties based on your TypeScript SectionConfig type
        }

        public interface ISecretProvider
        {
            // Define methods based on your TypeScript ISecretProvider interface
        }
    }

    public class DocuGen
    {
        public async Task<string> GenerateDocumentationAsync(EdgeJsIntegration bridge, string workspacePath,
            string excludeItemsFilePaths,
            string excludeExtensionsFilePaths,
            string itemsToBeIncludedFilePaths,
            string documentationFilePath,
            string modelEndpoint,
            string modelName,
            string modelVersion,
            bool useOllama)
        {
            return await bridge.GenerateDocumentationAsync(workspacePath,
                excludeItemsFilePaths,
                excludeExtensionsFilePaths,
                itemsToBeIncludedFilePaths,
                documentationFilePath,
                modelEndpoint,
                modelName,
                modelVersion,
                useOllama);
        }
    }
}
