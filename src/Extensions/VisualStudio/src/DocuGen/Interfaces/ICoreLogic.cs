using System.Collections.Generic;
using System.Threading.Tasks;

namespace DocuGen.Interfaces
{
    public interface ICoreLogic
    {
        Task<string> GenerateDocumentationAsync(
            string workspacePath,
            List<string> excludeItemsFilePaths,
            List<string> excludeExtensionsFilePaths,
            List<string> itemsToBeIncludedFilePaths,
            string documentationFilePath,
            string modelEndpoint,
            string modelName,
            string modelVersion,
            ModelProviderEnums modelProvider);
    }
}
