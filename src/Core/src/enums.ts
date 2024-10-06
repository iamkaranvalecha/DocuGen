export enum Enums {
    VSCode = "VSCode",
    VisualStudio = "VisualStudio",
    JetBrains = "JetBrains",
    GitHubActions = "GitHubActions",
    DevOps = "DevOps"
}

export enum SettingEnums {
    DefaultDocumentFileName = "defaultDocumentFileName", // This setting allows user to define the default file name for the generated documentation
    IncludedItems = "includedItems", // This is the list of valid files with supported extension that needs documentation
    ExcludedItems = "excludedItems", // This is the list of user & system defined folders & files that should be excluded
    UncheckedItems = "uncheckedItems", // This is the list of valid files with supported extension to be excluded from documentation being generated
    SupportedExtensions = "supportedExtensions" // This is the list of supported file extensions by DocuGen
}