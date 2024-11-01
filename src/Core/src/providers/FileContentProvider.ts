import { Constants } from "../constants";

const fs = require('fs').promises;
const readline = require('readline');

export class FileContentProvider {
    title = "DocuGen AI"
    description = Constants.extensionTagLine
    documentHeader: { title: string; description: string; };

    constructor() {
        this.documentHeader = {
            title: this.title,
            description: this.description
        };
    }

    generateHeaderContent() {
        return `# ${this.documentHeader.title}\n\n*${this.documentHeader.description}*\n\n`;
    }

    async updateFileContent(targetFilePath, tempFilePath, filePaths) {
        const tempContent = await this.readAndParseContent(tempFilePath);
        const processedPaths = new Set();

        // Check if the target file exists
        let fileExists = true;
        try {
            await fs.access(targetFilePath);
        } catch {
            fileExists = false;
        }

        // If the target file doesn't exist, create it with header and new content
        if (!fileExists) {
            const newContent = this.generateHeaderContent() + Object.values(tempContent).join('\n');
            await fs.writeFile(targetFilePath, newContent);
            return;
        }

        // Process the target file in chunks
        let { updatedContent, hasHeader } = await this.processFileInChunks(targetFilePath, tempContent, filePaths, processedPaths);

        // Only add header if it doesn't exist
        if (!hasHeader) {
            updatedContent = this.generateHeaderContent() + updatedContent;
        }

        // Append any new unmatched sections at the end
        const appendContent = await this.getUnprocessedContent(tempContent, filePaths, processedPaths);
        if (appendContent) {
            if (updatedContent && !updatedContent.endsWith('\n\n')) {
                updatedContent += '\n\n';
            }
            updatedContent += appendContent;
        }

        await fs.writeFile(targetFilePath, updatedContent);
    }

    async readAndParseContent(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const sections = {};

        const parts = content.split(/(?=### File:)/);
        for (const part of parts) {
            if (part.trim()) {
                const match = part.match(/### File: (.*?)\n/);
                if (match) {
                    const filePath = match[1].trim();
                    sections[filePath] = part;
                }
            }
        }
        return sections;
    }

    getUnprocessedContent(tempContent, filePaths, processedPaths) {
        let appendContent = '';
        for (const filePath of filePaths) {
            if (!processedPaths.has(filePath) && tempContent[filePath]) {
                appendContent += tempContent[filePath] + '\n';
            }
        }
        return appendContent;
    }

    async processFileInChunks(filePath, newContent, filePaths, processedPaths) {
        const fileStream = require('fs').createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let currentSection = '';
        let currentFilePath = '';
        let output = '';
        let isProcessingSection = false;
        let hasHeader = false;
        let isHeaderSection = false;
        let lineCount = 0;

        for await (const line of rl) {
            lineCount++;
            // Check for header in first few lines
            if (lineCount <= 2) {
                if (line.startsWith(`# ${this.title}`) ||
                    line.includes(this.description)) {
                    isHeaderSection = true;
                    hasHeader = true;
                }
            }

            // If we're in header section, include it as-is
            if (isHeaderSection) {
                output += line + '\n';
                if (line.trim() === '') {
                    isHeaderSection = false;
                }
                continue;
            }

            if (line.startsWith(Constants.prefix)) {
                if (currentSection) {
                    output += this.processSection(currentFilePath, currentSection, newContent, filePaths, processedPaths);
                    currentSection = '';
                }
                currentFilePath = line.replace(Constants.prefix, '').trim();
                isProcessingSection = true;
                currentSection = line + '\n';
            } else if (isProcessingSection) {
                currentSection += line + '\n';
            } else {
                output += line + '\n';
            }
        }

        if (currentSection) {
            output += this.processSection(currentFilePath, currentSection, newContent, filePaths, processedPaths);
        }

        return { updatedContent: output, hasHeader };
    }

    processSection(filePath, currentSection, newContent, filePaths, processedPaths) {
        if (filePaths.includes(filePath) && newContent[filePath]) {
            processedPaths.add(filePath);
            return newContent[filePath] + '\n';
        }
        return currentSection;
    }
}