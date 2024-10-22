using DocuGen.Interfaces;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace DocuGen
{
    public class CoreLogic : ICoreLogic
    {
        private readonly ISecretProvider _secretProvider;
        private readonly Providers _providers;

        public CoreLogic(ISecretProvider secretProvider, Providers providers)
        {
            _secretProvider = secretProvider ?? throw new ArgumentNullException(nameof(secretProvider));
            _providers = providers;
        }

        public async Task<string> GenerateDocumentationAsync(
            string workspacePath,
            List<string> excludeItemsFilePaths,
            List<string> excludeExtensionsFilePaths,
            List<string> itemsToBeIncludedFilePaths,
            string documentationFilePath,
            string modelEndpoint,
            string modelName,
            string modelVersion,
            ModelProviderEnums modelProvider)
        {
            try
            {
                Console.WriteLine($"Scanning repository: {workspacePath}");
                bool fileExists = CheckIfFileExists(workspacePath, documentationFilePath);
                Console.WriteLine($"Document file exists: {fileExists}");
                string documentation = "";

                if (!fileExists && itemsToBeIncludedFilePaths?.Any() == true)
                {
                    documentation = await GenerateDocumentationForFilesAsync(workspacePath, itemsToBeIncludedFilePaths, modelProvider, modelEndpoint, modelName, modelVersion);
                }
                else if (itemsToBeIncludedFilePaths?.Any() == true)
                {
                    documentation = await UpdateExistingDocumentationAsync(workspacePath, documentationFilePath, excludeExtensionsFilePaths, itemsToBeIncludedFilePaths, modelProvider, modelEndpoint, modelName, modelVersion);
                }
                else
                {
                    throw new Exception("No files to be included in documentation.");
                }

                if (!string.IsNullOrEmpty(documentation))
                {
                    return documentation;
                }
                else
                {
                    throw new Exception("Unable to generate documentation");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error received - {ex}");
                throw;
            }
        }

        private async Task<string> UpdateExistingDocumentationAsync(string workspacePath, string documentationFilePath, List<string> excludeExtensionsFilePaths, List<string> itemsToBeIncludedFilePaths, ModelProviderEnums modelProvider, string modelEndpoint, string modelName, string modelVersion)
        {
            string fileContent = ReadDocumentationFileContent(workspacePath, documentationFilePath);
            if (string.IsNullOrEmpty(fileContent))
            {
                return string.Empty;
            }

            if (itemsToBeIncludedFilePaths != null)
            {
                string[] sections = Regex.Split(fileContent, @"(?=### File:)");
                List<FileSection> crossCheckSectionsAgainstIncludedItems = new List<FileSection>();
                List<string> filePathsInFile = new List<string>();

                for (int i = 1; i < sections.Length; i++)
                {
                    string section = sections[i];
                    var match = Regex.Match(section, @"^(.*?\\[\w\s]+(?:\\[\w\s]+)*\.\w+)\n([\s\S]*)");
                    string filePath = match.Success ? match.Groups[1].Value.Trim() : section.Split(Constants.NewLine)[0].Trim();
                    string content = match.Success ? match.Groups[2].Value.Trim() : section.Split(filePath.ToCharArray())[1].Trim();

                    string fileName = Path.GetFileName(filePath);
                    filePathsInFile.Add(filePath);

                    bool isIncluded = itemsToBeIncludedFilePaths.Contains(filePath) && !excludeExtensionsFilePaths.Contains(filePath);

                    crossCheckSectionsAgainstIncludedItems.Add(new FileSection
                    {
                        FileName = fileName,
                        FilePath = filePath,
                        Section = section,
                        ToBeAnalysed = isIncluded,
                        AppendAtEnd = false
                    });
                }

                foreach (var item in ExcludeInvalidFiles(itemsToBeIncludedFilePaths))
                {
                    if (!string.IsNullOrEmpty(item) && !crossCheckSectionsAgainstIncludedItems.Any(x => x.FilePath == item))
                    {
                        crossCheckSectionsAgainstIncludedItems.Add(new FileSection
                        {
                            FileName = Path.GetFileName(item),
                            FilePath = item,
                            Section = "",
                            ToBeAnalysed = true,
                            AppendAtEnd = true
                        });
                    }
                }

                foreach (var item in crossCheckSectionsAgainstIncludedItems)
                {
                    if (item.ToBeAnalysed)
                    {
                        string originalFileContent = ReadFileContent(Path.Combine(workspacePath, item.FilePath));
                        if (!string.IsNullOrEmpty(originalFileContent))
                        {
                            string updatedContent = "";
                            try
                            {
                                updatedContent = await _providers.SendRequestToModelAsync(GetSummaryPrompt(), originalFileContent, modelProvider, modelEndpoint, modelName, modelVersion);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine(ex);
                                updatedContent = "`Unable to generate documentation. Please try again later.`";
                            }

                            if (!string.IsNullOrEmpty(updatedContent))
                            {
                                string finalContent = FormContentInFormat(item.FilePath, updatedContent);
                                if (item.AppendAtEnd)
                                {
                                    fileContent += finalContent;
                                }
                                else
                                {
                                    int filePathIndex = fileContent.IndexOf(FormFilePathWithPrefix(item.FilePath));
                                    int contentStartIndex = filePathIndex;
                                    int contentEndIndex = fileContent.IndexOf(Constants.Prefix + item.Section) + item.Section.Length + Constants.Suffix.Length + 1;

                                    if (contentStartIndex == -1 || contentEndIndex == -1)
                                    {
                                        continue;
                                    }

                                    fileContent = fileContent.Substring(0, contentStartIndex) +
                                        finalContent +
                                        fileContent.Substring(contentEndIndex);
                                }
                            }
                            else
                            {
                                throw new Exception("Unable to generate documentation");
                            }
                        }
                    }
                }
            }

            return fileContent;
        }

        private string FormFilePathWithPrefix(string filePath)
        {
            return $"{Constants.Prefix}{Constants.Space}{filePath}";
        }

        private string FormContentInFormat(string filePath, string content)
        {
            return $"{FormFilePathWithPrefix(filePath)}{Constants.NewLine}{content}{Constants.Suffix}";
        }

        private string ReadFileContent(string filePath)
        {
            try
            {
                return File.ReadAllText(filePath.Trim());
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        private string ReadDocumentationFileContent(string workspaceFolder, string filePath)
        {
            try
            {
                filePath = Path.Combine(workspaceFolder, filePath);
                Console.WriteLine($"Reading file: {filePath}");
                return File.ReadAllText(filePath.Trim());
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        private bool CheckIfFileExists(string workspaceFolder, string filePath)
        {
            try
            {
                filePath = Path.Combine(workspaceFolder, filePath);
                File.ReadAllText(filePath.Trim());
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<string> GenerateDocumentationForFilesAsync(string workspacePath, List<string> files, ModelProviderEnums modelProvider, string modelEndpoint, string modelName, string modelVersion)
        {
            string fileDocumentation = Constants.FileTitle;
            Console.WriteLine($"Generating documentation for files: {string.Join(", ", files)}");

            foreach (var file in ExcludeInvalidFiles(files))
            {
                if (!string.IsNullOrEmpty(file))
                {
                    string filePath = Path.Combine(workspacePath, file);
                    Console.WriteLine($"Generating documentation for current file: {filePath}");
                    string document = File.ReadAllText(filePath.Trim());

                    Console.WriteLine($"file content: {document}");
                    string summary = await new Providers(_secretProvider).SendRequestToModelAsync(GetSummaryPrompt(), document, modelProvider, modelEndpoint, modelName, modelVersion);

                    Console.WriteLine("Summary generated");
                    fileDocumentation += FormContentInFormat(file, summary);
                }
            }

            return fileDocumentation;
        }

        private List<string> ExcludeInvalidFiles(List<string> files)
        {
            return files.Where(x => !string.IsNullOrEmpty(x) && !string.IsNullOrEmpty(Path.GetExtension(x))).ToList();
        }

        private string GetSummaryPrompt()
        {
            return "Summarize this code file. Breakdown the code & highlight explanation of each method or api using best formatting practices. Strictly do not share full code in output response. make sure to not make any assumption about the code & strictly stick to the content. DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.\n";
        }
    }
}