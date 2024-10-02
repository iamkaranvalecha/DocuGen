export enum Enums {
    VSCode = "VSCode",
    VisualStudio = "VisualStudio",
    JetBrains = "JetBrains",
    GithubActions = "GithubActions",
    DevOps = "DevOps"
}

export enum SettingEnums {
    DefaultDocumentFileName = "defaultDocumentFileName", // This setting allows user to define the default file name for the generated documentation
    IncludedItems = "includedItems", // This is the list of valid files that needs documentation
    ExcludedItems = "excludedItems", // This is the list of unsupported files by DocuGen that should be excluded from being detected
    UncheckedItems = "uncheckedItems", // This is the list of valid files to be excluded from documentation being generated
    SupportedExtensions = "supportedExtensions" // This is the list of supported file extensions by DocuGen
}