"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocuGen = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const constants_1 = require("./constants");
const providers_1 = require("./providers");
class DocuGen {
    constructor(ISecretProvider) {
        if (!ISecretProvider) {
            throw new Error('Secret provider is required');
        }
        this.ISecretProvider = ISecretProvider;
    }
    generateDocumentation(workspacePath, excludeItemsFilePaths, excludeExtensionsFilePaths, itemsToBeIncludedFilePaths, documentationFilePath, modelEndpoint, modelName, modelVersion, useOllama) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Scanning repository:', workspacePath);
                const fileExists = yield this.checkIfFileExists(workspacePath, documentationFilePath);
                console.log('Document file exists:', fileExists);
                let documentation = '';
                if (fileExists === false && itemsToBeIncludedFilePaths !== undefined && itemsToBeIncludedFilePaths.length > 0) {
                    documentation = yield this.generateDocumentationForFiles(workspacePath, itemsToBeIncludedFilePaths, useOllama, modelEndpoint, modelName, modelVersion);
                }
                else {
                    documentation = yield this.updateExistingDocumentation(workspacePath, documentationFilePath, excludeExtensionsFilePaths, itemsToBeIncludedFilePaths, useOllama, modelEndpoint, modelName, modelVersion);
                }
                if (documentation.length > 0) {
                    return documentation;
                }
                else {
                    throw new Error("Unable to generate documentation");
                }
            }
            catch (exception) {
                console.log("Error received -" + exception);
                throw exception;
            }
        });
    }
    updateExistingDocumentation(workspacePath, documentationFilePath, excludeExtensionsFilePaths, itemsToBeIncludedFilePaths, useOllama, modelEndpoint, modelName, modelVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            // Read the file & split in sections based on '### File:' format
            let fileContent = yield this.readDocumentationFileContent(workspacePath, documentationFilePath);
            if (!fileContent) {
                return;
            }
            if (itemsToBeIncludedFilePaths !== undefined) {
                // Split the file content by sections using regex for more precise matching
                let sections = fileContent.split(/### File:/);
                let crossCheckSectionsAgainstIncludedItems = [];
                let filePathsInFile = [];
                for (let i = 1; i < sections.length; i++) {
                    const section = sections[i];
                    // Use regex to find section start and end
                    const regex = /^(.*?\\[\w\s]+(?:\\[\w\s]+)*\.\w+)\n([\s\S]*)/;
                    const match = regex.exec(section);
                    let filePath = '';
                    let content = '';
                    if (match) {
                        filePath = match[1].trim(); // Extract the file path
                        content = match[2].trim(); // Extract the content after the file path
                    }
                    else {
                        filePath = section.split(constants_1.Constants.newLine)[0].trim();
                        content = section.split(filePath)[1].trim();
                    }
                    const fileName = this.getFileNameFromPath(filePath);
                    // Track the file paths in the current content
                    filePathsInFile.push(filePath);
                    const isIncluded = itemsToBeIncludedFilePaths.includes(filePath) && !excludeExtensionsFilePaths.includes(filePath);
                    crossCheckSectionsAgainstIncludedItems.push({
                        fileName: fileName,
                        filePath: filePath,
                        section: section,
                        toBeAnalysed: isIncluded,
                        appendAtEnd: false
                    });
                }
                // Handle files to be added if not already present
                for (const item of this.excludeInvalidFiles(itemsToBeIncludedFilePaths)) {
                    if (item !== undefined && !crossCheckSectionsAgainstIncludedItems.some(x => x.filePath === item)) {
                        crossCheckSectionsAgainstIncludedItems.push({
                            fileName: this.getFileNameFromPath(item),
                            filePath: item,
                            section: '',
                            toBeAnalysed: true,
                            appendAtEnd: true
                        });
                    }
                }
                // Process each section and analyze or append content
                for (const item of crossCheckSectionsAgainstIncludedItems) {
                    const { filePath, fileName, section, toBeAnalysed, appendAtEnd } = item;
                    if (toBeAnalysed) {
                        const originalFileContent = yield this.readFileContent(workspacePath + filePath);
                        if (originalFileContent.length > 0) {
                            let updatedContent = '';
                            try {
                                updatedContent = yield new providers_1.Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), originalFileContent, useOllama, modelEndpoint, modelName, modelVersion);
                            }
                            catch (error) {
                                console.log(error);
                                updatedContent = "`Unable to generate documentation. Please try again later.`";
                            }
                            if (updatedContent.length > 0) {
                                let finalContent = this.formContentInFormat(filePath, updatedContent);
                                if (appendAtEnd) {
                                    // Append new content to the end if not present
                                    fileContent += finalContent;
                                }
                                else {
                                    const filePathIndex = fileContent.indexOf(this.formFilePathWithPrefix(filePath)); // Index of the start of the file path
                                    const contentStartIndex = filePathIndex; // Index of the start of the content
                                    const contentEndIndex = (fileContent.indexOf(constants_1.Constants.prefix + section) + section.length) + constants_1.Constants.suffix.length + 1; // End index
                                    if (contentStartIndex === -1 || contentEndIndex === -1) {
                                        continue; // Skip if section boundaries are invalid
                                    }
                                    // Replace the old content in the section
                                    fileContent = fileContent.slice(0, contentStartIndex) +
                                        finalContent +
                                        fileContent.slice(contentEndIndex);
                                }
                            }
                            else {
                                throw new Error("Unable to generate documentation");
                            }
                        }
                    }
                }
                return fileContent;
            }
        });
    }
    formFilePathWithPrefix(filePath) {
        return `${constants_1.Constants.prefix}${constants_1.Constants.space}${filePath}`;
    }
    formContentInFormat(filePath, content) {
        return `${this.formFilePathWithPrefix(filePath)}${constants_1.Constants.newLine}${content}${constants_1.Constants.suffix}`;
    }
    getFileNameFromPath(filePath) {
        try {
            const fileName = path.basename(filePath);
            return fileName;
        }
        catch (error) {
            throw error;
        }
    }
    readFileContent(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield fs.promises.readFile(filePath.trim(), 'utf8');
                return data;
            }
            catch (error) {
                throw error;
            }
        });
    }
    readDocumentationFileContent(workspaceFolder, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                filePath = path.join(workspaceFolder, filePath);
                console.log('Reading file:', filePath);
                const data = yield fs.promises.readFile(filePath.trim(), 'utf8');
                return data;
            }
            catch (error) {
                throw error;
            }
        });
    }
    checkIfFileExists(workspaceFolder, filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                filePath = path.join(workspaceFolder, filePath);
                yield fs.promises.readFile(filePath.trim());
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    generateDocumentationForFiles(workspacePath, files, useOllama, modelEndpoint, modelName, modelVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            let fileDocumentation = constants_1.Constants.fileTitle;
            console.log('Generating documentation for files:', files);
            for (const file of this.excludeInvalidFiles(files)) {
                if (file !== undefined) {
                    const filePath = path.join(workspacePath, file);
                    console.log('Generating documentation for current file: ', filePath);
                    const document = fs.readFileSync(filePath.trim(), 'utf8');
                    console.log('file content:', document);
                    // Generate a summary for each file's content
                    const summary = yield new providers_1.Providers(this.ISecretProvider).sendRequestToModel(this.getSummaryPrompt(), document, useOllama, modelEndpoint, modelName, modelVersion);
                    console.log('Summary generated');
                    fileDocumentation += this.formContentInFormat(file, summary);
                }
            }
            return fileDocumentation;
        });
    }
    excludeInvalidFiles(files) {
        return files.filter(x => x !== undefined && path.extname(x) !== '');
    }
    getSummaryPrompt() {
        return `Summarize this code file. Breakdown the code & highlight explanation of each method or api using best formatting practices. Strictly do not share full code in output response. make sure to not make any assumption about the code & strictly stick to the content. DO NOT USE FOUL LANGUAGE. ALWAYS BE PROFESSIONAL.\n`;
    }
}
exports.DocuGen = DocuGen;
//# sourceMappingURL=docugen.js.map