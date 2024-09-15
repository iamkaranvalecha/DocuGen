import * as vscode from 'vscode'; 
import * as fs from 'fs'; 
import * as path from 'path'; 
 
export function activate2(context: vscode.ExtensionContext) { 
    context.subscriptions.push(vscode.commands.registerCommand('extension.showQuickPick', () => { 
        const workspaceFolders = vscode.workspace.workspaceFolders; 
        if (workspaceFolders) { 
            const rootPath = workspaceFolders[0].uri.fsPath; 
            showFolderQuickPick(rootPath); 
        } else { 
            vscode.window.showErrorMessage("No workspace folder is open."); 
        } 
    })); 
} 
 
export function showFolderQuickPick(rootPath: string) { 
    const quickPick = vscode.window.createQuickPick(); 
    quickPick.title = `Select items from ${path.basename(rootPath)}`; 
    quickPick.canSelectMany = true;  // Enable multi-select (checkboxes) 
 
    // Get all directories and files recursively 
    const items = getItemsRecursively(rootPath); 

    if (items.length === 0) { 
        vscode.window.showInformationMessage("No items found."); 
        return; 
    } 
 
    // Set items in QuickPick with descriptions 
    quickPick.items = items.map(item => {
        const fullPath = path.join(rootPath, item);
        const isDirectory = fs.statSync(fullPath).isDirectory();
        const ext = path.extname(item).toLowerCase();
        return { 
            label: item, 
            description: isDirectory ? 'Directory' : 'File' ,
            iconPath: isDirectory 
                ? new vscode.ThemeIcon('folder') 
                : new vscode.ThemeIcon(getFileIcon(ext))
                
        }; 
    }); 
 
    let currentlySelectedItems: Set<string> = new Set(); // Tracks currently selected items 
 
    quickPick.onDidChangeSelection(selection => { 
        const selectedItems = new Set(selection.map(item => item.label)); 
         
        // Find items that have been newly selected or deselected 
        const newlySelectedItems = [...selectedItems].filter(item => !currentlySelectedItems.has(item)); 
        const newlyDeselectedItems = [...currentlySelectedItems].filter(item => !selectedItems.has(item)); 
 
        // Process newly selected items (recursive selection for directories) 
        newlySelectedItems.forEach(item => { 
            // If parent (directory) selected, add all children 
            const children = getChildren(item, items); 
            children.forEach(child => selectedItems.add(child)); 
        }); 
 
        // Process newly deselected items (recursive deselection for directories) 
        newlyDeselectedItems.forEach(item => { 
            // If parent (directory) deselected, remove all its children 
            const children = getChildren(item, items); 
            children.forEach(child => selectedItems.delete(child)); 
        }); 
 
        // Update the final selection state 
        currentlySelectedItems = new Set(selectedItems); 
        quickPick.selectedItems = quickPick.items.filter(item => selectedItems.has(item.label)); 
    }); 
 
    quickPick.onDidAccept(() => { 
        const finalSelection = quickPick.selectedItems.map(item => item.label); 
        vscode.window.showInformationMessage(`You selected: ${finalSelection.join(', ')}`); 
        quickPick.hide(); 
    }); 
 
    quickPick.show(); 
} 
 
// Function to get all directories and files recursively 
function getItemsRecursively(source: string, parent: string = ''): string[] { 
    let itemsList: string[] = []; 
     
    try { 
        const items = fs.readdirSync(source); 
        for (const item of items) { 
            const fullPath = path.join(source, item); 
            const relativePath = path.join(parent, item); 
             
            if (fs.statSync(fullPath).isDirectory()) { 
                // Add the directory to the list 
                itemsList.push(relativePath); 
 
                // Recursively get subdirectories and files 
                itemsList = itemsList.concat(getItemsRecursively(fullPath, relativePath)); 
            } else {
                // Add the file to the list
                // itemsList.push(relativePath);

                const ext = path.extname(item).toLowerCase();
                // Exclude non-standard file types
                if (isSupportedExtFile(ext)) {
                    // Add the file to the list 
                    itemsList.push(relativePath); 
                }
            }
        } 
    } catch (err) { 
        vscode.window.showErrorMessage(`Error reading directories: ${err.message}`); 
    } 
     
    return itemsList; 
} 
 
// Function to get all child items (files and folders) of a given folder 
function getChildren(parent: string, allItems: string[]): string[] { 
    return allItems.filter(item => item.startsWith(parent + path.sep)); 
}

// Function to get file icon based on extension
function getFileIcon(extension: string): string {
    switch (extension) {
        case '.js': case '.ts': case '.jsx': case '.tsx': case '.json':
            return 'file-code'; // Code files
        case '.json':
            return 'file-json'; // JSON files
        case '.md': case '.txt':
            return 'file-text'; // Text files
        case '.png': case '.jpg': case '.jpeg': case '.gif':
            return 'file-media'; // Image files
        case '.pdf':
            return 'file-pdf'; // PDF files
        case '.zip': case '.tar': case '.gz':
            return 'file-zip'; // Archive files
        default:
            return 'file'; // Default icon for other files
    }
}
// Function to determine if a file extension should be excluded
function isSupportedExtFile(extension: string): boolean {
    const supportedExtensions =[
        ".js",
        ".ts",
        ".json",
        ".html",
        ".css",
        ".less",
        ".scss",
        ".vue",
        ".jsx",
        ".tsx",
        ".py",
        ".ipynb",
        ".yaml",
        ".yml",
        ".java",
        ".xml",
        ".properties",
        ".c",
        ".cpp",
        ".h",
        "Makefile",
        ".cs",
        ".config",
        ".rb",
        ".gemspec",
        ".gemfile",
        ".rake",
        ".php",
        ".swift",
        ".plist",
        ".kt",
        ".m",
        ".bat",
        ".ps1",
        "Dockerfile",
        ".tf"
      ];
    return supportedExtensions.includes(extension);
}