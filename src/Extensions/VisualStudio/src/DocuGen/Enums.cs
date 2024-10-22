
public enum Enums
{
    VSCode,
    VisualStudio,
    JetBrains,
    GitHubActions,
    DevOps
}

internal enum SettingEnums
{
    DefaultDocumentFileName, // This setting allows user to define the default file name for the generated documentation
    IncludedItems, // This is the list of valid files with supported extension that needs documentation
    ExcludedItems, // This is the list of user & system defined folders & files that should be excluded
    UncheckedItems, // This is the list of valid files with supported extension to be excluded from documentation being generated
    SupportedExtensions // This is the list of supported file extensions by DocuGen
}

public enum ModelProviderEnums
{
    AzureOpenAI,
    Ollama
}