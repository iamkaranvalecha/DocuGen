const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Starting post-build script...");

try {
    const currentDir = __dirname;
    console.log('Current directory - '+  currentDir);

    let libraryPath = currentDir.replace('Extensions\\VisualStudio\\src','Core')
    const sourceDir = path.join(libraryPath, 'dist');
    console.log('Source directory - '+  sourceDir);

    let targetDir = __dirname += '\\Resources\\scripts';
    console.log('Target directory - '+  targetDir);

    let projectFilePath = __dirname.replace('Resources\\scripts','DocuGen.csproj'); // Adjust this path to your project file
    console.log('Project file path - '+  projectFilePath);

    execSync(`npm install && npm run build-tsc`, {cwd: libraryPath, stdio: 'inherit' });

    // Function to copy a file
    const copyFile = (src, dest) => {
        fs.copyFileSync(src, dest);
    };

    // Function to copy a folder recursively
    const copyFolderRecursiveSync = (src, dest) => {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (let entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                copyFolderRecursiveSync(srcPath, destPath);
            } else {
                copyFile(srcPath, destPath);
            }
        }
    };

    copyFolderRecursiveSync(sourceDir, targetDir);

    // Function to include copied files in the project file
    const includeFilesInProject = (dir) => {
        const files = fs.readdirSync(dir);

        // Read the project file as a string
        let projectFileContent = fs.readFileSync(projectFilePath, 'utf-8');

        // Find the insertion point (after the last ItemGroup element)
        const insertPoint = projectFileContent.lastIndexOf('</ItemGroup>');
        
        if (insertPoint === -1) {
            console.error("No <ItemGroup> found in project file.");
            return;
        }

        /// Extract existing file entries to check for duplicates
        const existingEntries = new Set();
        const regex = /<Content CopyToOutputDirectory="Always" Include="([^"]+)">/g;
        let match;
        while ((match = regex.exec(projectFileContent)) !== null) {
            existingEntries.add(match[1].trim());
        }

        // Create the new file entries
        let newEntries = files
            .filter(file => path.extname(file) === '.js') // Adjust the extension as necessary
            .map(file => path.relative(currentDir, path.join('Resources','scripts', file)))
            .filter(relativePath => !existingEntries.has(relativePath)) // Check if already included
            .map(file => `<Content CopyToOutputDirectory="Always" Include="${file}">
                <IncludeInVSIX>true</IncludeInVSIX>
            </Content>\n`)
            .join('');

        if (newEntries) {
            // Insert the new entries before the closing </ItemGroup>
            projectFileContent = projectFileContent.slice(0, insertPoint) + newEntries + projectFileContent.slice(insertPoint);
        
            // Write the modified content back to the project file
            fs.writeFileSync(projectFilePath, projectFileContent, 'utf-8');
            console.log("Files included in project successfully.");
        } else {
            console.log("No new files to include in the project.");
        }
    };

    // Include copied files in the project
    includeFilesInProject(targetDir);

    console.log("post-build script completed successfully.");
} catch (error) {
    console.error("Error in post-build script:", error);
    process.exit(1); // Exit with a non-zero code to indicate failure
}