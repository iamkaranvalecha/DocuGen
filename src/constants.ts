import * as vscode from 'vscode';

export const Constants = {
    extensionName: 'DocuGen',
    prefix: `### File: `,
    suffix: `\n\n----\n`,
    newLine: `\n`,
    fileTitle: "### AI Generated Documentation using DocuGen\n----\n",
    supportedExtensions: [".js", ".ts", ".json", ".html", ".css", ".less", ".scss", ".vue", ".jsx", ".tsx", ".py", ".ipynb", ".yaml", ".yml", ".java", ".xml", ".properties", ".c", ".cpp", ".h", "Makefile", ".cs", ".config", ".rb", ".gemspec", ".gemfile", ".rake", ".php", ".swift", ".plist", ".kt", ".m", ".bat", ".ps1", "Dockerfile", ".tf"],
    excludedFolders: [".git", ".vscode", ".vs", "node_modules", "dist", "build", ".venv", "bin", "obj", ".config"]
}

export function Configuration() {
    return vscode.workspace.getConfiguration(Constants.extensionName.toLowerCase());
}