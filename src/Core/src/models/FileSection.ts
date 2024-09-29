export interface FileSection {
    fileName: string;        // Name of the file
    filePath: string;        // Full path of the file
    section: string;         // Section name or identifier
    toBeAnalysed: boolean;   // Flag indicating if the section should be analysed
    appendAtEnd: boolean;    // Flag indicating if new content should be appended at the end of the section
  }
  