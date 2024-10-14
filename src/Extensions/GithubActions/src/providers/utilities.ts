import { Enums, SectionConfig, Constants as DocuGenConstants } from 'docugen'
import * as fs from 'fs'
import path from 'path'
import { GitHubActionSecretProvider } from './githubActionSecretProvider'

export function configFileExists(filePath: string): boolean {
  try {
    const fileContents = fs.readFileSync(filePath).toString()
    if (fileContents.length > 0) {
      return JSON.parse(fileContents).map((x: any) => {
        if (x.name === Enums.GitHubActions) {
          return true
        }
      })
    }

    return false
  } catch (error) {
    return false
  }
}

export function readConfigFile(configFilePath: string): SectionConfig[] {
  if (fs.existsSync(configFilePath)) {
    const fileContents = fs.readFileSync(configFilePath, 'utf-8')
    return JSON.parse(fileContents)
  } else {
    return []
  }
}

export function getUncheckedItems(uncheckedItems: string[] = []): string[] {
  if (uncheckedItems === undefined) {
    return []
  }
  return removeDuplicates(uncheckedItems.filter(x => x.trim() !== ''))
}

export function excludeInvalidExtensions(files: string[]) {
  return files.filter(x => x !== undefined && path.extname(x) !== '')
}

export function excludeInvalidFilesAndFolder(files: string[]) {
  return files.filter(
    x =>
      x !== undefined && x !== '' && !x.includes(DocuGenConstants.excludedItems)
  )
}

export function removeDuplicates(arr: string[]): string[] {
  return [...new Set(arr.filter(item => item.trim() !== ''))]
}

export function getChildren(parent: string, allItems: string[]): string[] {
  return allItems.filter(item => item.startsWith(parent + path.sep))
}

export function getExcludedItems(
  excludedItems: string[] = DocuGenConstants.excludedItems.split(',')
): string[] {
  if (excludedItems === undefined) {
    return DocuGenConstants.excludedItems.split(',')
  }
  return removeDuplicates(
    excludedItems
      .concat(DocuGenConstants.excludedItems.split(','))
      .filter(x => x.trim() !== '')
  )
}

export function getSupportedExtensions(
  supportedExtensions: string[] = DocuGenConstants.supportedExtensions.split(
    ','
  )
): string[] {
  if (supportedExtensions === undefined) {
    return DocuGenConstants.supportedExtensions.split(',')
  }
  return removeDuplicates(
    supportedExtensions
      .concat(DocuGenConstants.supportedExtensions.split(','))
      .filter(x => x.trim() !== '')
  )
}

// Function to get all directories and files recursively
export function getItemsRecursively(
  excludedItems: string[],
  source: string,
  isInitialRun: boolean,
  changedFiles: string[],
  parent: string = ''
): string[] {
  try {
    const items = isInitialRun ? fs.readdirSync(source) : changedFiles

    const filteredItems = removeDuplicates(
      items.filter(x => !excludedItems.includes(x))
    )

    return validateFiles(
      filteredItems,
      excludedItems,
      source,
      parent,
      isInitialRun,
      changedFiles
    )
  } catch (err) {
    throw Error(`Error reading directories: ${err}`)
  }
}

function validateFiles(
  filteredItems: string[],
  excludedItems: string[],
  source: string,
  parent: string,
  isInitialRun: boolean,
  changedFiles: string[]
): string[] {
  let itemsList: string[] = []
  for (const item of filteredItems) {
    // Exclude items starting with a dot ('.')
    if (
      !/^[A-Za-z0-9].*/.test(item) ||
      item.startsWith('.') ||
      item.startsWith('_')
    ) {
      continue // Skip items not starting with an alphabet or valid number
    }
    try {
      const fullPath = path.join(source, item)
      const relativePath = path.join(parent, item)

      if (fs.statSync(fullPath).isDirectory()) {
        // Add the directory to the list
        itemsList.push(relativePath)

        // Recursively get subdirectories and files
        itemsList = itemsList.concat(
          getItemsRecursively(
            excludedItems,
            fullPath,
            isInitialRun,
            changedFiles,
            relativePath
          )
        )
      } else {
        // Add the file to the list
        const ext = path.extname(item).toLowerCase()
        if (ext.length > 0) {
          // Exclude non-standard file types
          const isSupported = isSupportedExtFile(ext)
          if (isSupported === true) {
            // Add the file to the list
            itemsList.push(relativePath)
          }
        }
      }
    } catch (error) {
      continue
    }
  }

  return itemsList
}

export function getGitIgnoreItems(
  workspaceFsPath: string,
  excludedItems: string[]
): string[] {
  // Read .gitignore file if present & exclude the folders & extensions
  const gitIgnorePath = workspaceFsPath + '/.gitignore'
  let gitIgnoreContent = ''
  if (gitIgnorePath) {
    try {
      gitIgnoreContent = fs.readFileSync(gitIgnorePath).toString()
      const gitExcludeItemsList = gitIgnoreContent
        .split('\n')
        .filter(
          line => line.trim().startsWith('/') || line.trim().endsWith('/')
        )
        .map(folder => folder.trim())
        .filter(folder => !excludedItems.includes(folder.trim()))

      // Remove duplicates by converting to a Set
      for (const item of gitExcludeItemsList) {
        if (!excludedItems.includes(item.trim())) {
          excludedItems.push(item.trim())
        }
      }
    } catch (error) {
      console.log('No .gitignore file found')
    }
  }

  return excludedItems
}

// Function to determine if a file extension should be excluded
function isSupportedExtFile(extension: string): boolean {
  return getSupportedExtensions().includes(extension)
}

export function getSecretProvider() {
  return new GitHubActionSecretProvider()
}
