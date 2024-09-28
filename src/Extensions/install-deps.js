const { execSync } = require('child_process');
const path = require('path');
let libraryPath = __dirname.replace('Extensions','Core')
console.log('current path', libraryPath);
try {
  // Run the npm install command for the library
  execSync(`npm install`, {cwd: libraryPath, stdio: 'inherit' });
  console.log('Dependencies installed successfully.');
} catch (error) {
  console.error('Failed to install dependencies:', error.message);
}
