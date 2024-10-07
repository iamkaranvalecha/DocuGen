using EdgeJs;
using Newtonsoft.Json;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

namespace DocuGen_CommunityToolkit.Integration
{
    public class EdgeJsIntegration
    {
        private string GetExtensionPath()
        {
            // Get the current assembly location
            var asm = Assembly.GetExecutingAssembly().Location;
            
            return Path.GetDirectoryName(asm);
        }

        public async Task<string> GenerateDocumentationAsync(string workspacePath,
            string excludeItemsFilePaths,
            string excludeExtensionsFilePaths,
            string itemsToBeIncludedFilePaths,
            string documentationFilePath,
            string modelEndpoint,
            string modelName,
            string modelVersion,
            string modelProvider)
        {

            Edge.SetAssemblyDirectory(GetExtensionPath());

            var edge = Edge.Func(@"
                return function (input, callback) {
                    var module = require('/scripts/index.js');
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
                        input.modelProvider
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
                modelProvider
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

        public class ModelProviderEnums
        {
            // Define enum properties based on your TypeScript ModelProviderEnums type
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
            string modelProvider)
        {
            return await bridge.GenerateDocumentationAsync(workspacePath,
                excludeItemsFilePaths,
                excludeExtensionsFilePaths,
                itemsToBeIncludedFilePaths,
                documentationFilePath,
                modelEndpoint,
                modelName,
                modelVersion,
                modelProvider);
        }
    }
}

