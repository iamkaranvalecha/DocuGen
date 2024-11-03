// task.ts
import * as path from 'path'
import * as task from 'azure-pipelines-task-lib/task'
import {
  configFileExists,
  excludeInvalidExtensions,
  excludeInvalidFilesAndFolder,
  getExcludedItems,
  getGitIgnoreItems,
  getItemsRecursively,
  getSecretProvider,
  getSupportedExtensions,
  getUncheckedItems,
  readConfigFile,
  removeDuplicates
} from './providers/utilities'
import { preCheckProvider } from './providers/precheckprovider'
import {
  commitDocumentationChanges,
  writeContentToFile,
  updateConfigFile,
  writeConfigFile,
  writeFileSync,
  appendToTempFile,
  deleteTempFile
} from './providers/writefile'
import {
  DocuGen,
  Constants as DocuGenConstants,
  Enums,
  SectionConfig,
  ModelProviderEnums,
  FileContentProvider
} from 'docugen'
import { getChangedFiles, getPullRequestList } from './providers/fileprovider'

const defaultExtension: string = '.md'
const extensionName = DocuGenConstants.extensionName.toLowerCase()

async function run() {
  try {
    preCheckProvider()

    const collectionUri = task.getVariable('System.CollectionUri') || ''
    const project = task.getVariable('System.TeamProject') || ''
    const repoName = task.getVariable('Build.Repository.Name') || ''
    const accessToken = process.env.SYSTEM_ACCESSTOKEN || ''

    var { pullRequestId, gitApi, repo, isSuccess } = await getPullRequestList(
      collectionUri,
      project,
      repoName,
      accessToken
    )
    console.log('IS PR ', isSuccess)
    if (isSuccess) {
      // Input variables from the task definition
      const modelEndpoint = process.env.modelEndpoint || ''
      const modelName = process.env.modelName || ''
      const modelVersion = process.env.modelVersion || ''
      const modelApiKey = process.env.apiToken || ''
      const modelProvider: ModelProviderEnums = (process.env.modelProvider ||
        '') as ModelProviderEnums
      const excludedItems = process.env.excludedItems || ''
      const uncheckedItems = process.env.uncheckedItems || ''
      const supportedExtensions = process.env.supportedExtensions || ''

      // Validate model configuration
      if (
        !validModelConfig(modelEndpoint, modelName, modelVersion, modelApiKey)
      ) {
        throw Error('Invalid model configuration')
      }

      const workspaceFsPath = task.getVariable('System.DefaultWorkingDirectory')

      if (!workspaceFsPath) {
        task.setResult(
          task.TaskResult.Failed,
          'Unable to determine workspace path'
        )
        throw Error('Unable to determine workspace path')
      }

      const workspacePathPrefix = workspaceFsPath + path.sep
      const configFilePath =
        workspacePathPrefix + DocuGenConstants.configFileName
      let isInitialRun = false

      let sectionConfig = new SectionConfig(
        Enums.DevOps,
        extensionName,
        DocuGenConstants.excludedItems,
        '',
        '',
        DocuGenConstants.supportedExtensions
      )

      // Configuration file handling
      if (!configFileExists(configFilePath)) {
        const existingSections = readConfigFile(configFilePath)
        existingSections.push(sectionConfig)
        isInitialRun = true
        console.log('isInitialRun> ', isInitialRun)
        writeConfigFile(configFilePath, existingSections)
      } else {
        const sectionFromConfig = readConfigFile(configFilePath).filter(
          x => x.name === Enums.DevOps
        )
        if (sectionFromConfig.length > 0) {
          sectionConfig = sectionFromConfig[0]
        }
      }

      // Update section configuration
      sectionConfig.values.excludedItems = [
        sectionConfig.values.excludedItems,
        excludedItems || ''
      ]
        .filter(item => item && item.trim() !== '')
        .join(',')

      sectionConfig.values.uncheckedItems = [
        sectionConfig.values.uncheckedItems,
        uncheckedItems || ''
      ]
        .filter(item => item && item.trim() !== '')
        .join(',')

      sectionConfig.values.supportedExtensions = [
        sectionConfig.values.supportedExtensions,
        supportedExtensions || ''
      ]
        .filter(item => item && item.trim() !== '')
        .join(',')

      // Process unchecked items
      let processedUncheckedItems: string[] = []
      if (
        sectionConfig.values.uncheckedItems.length > 0 &&
        sectionConfig.values.uncheckedItems.includes(',')
      ) {
        processedUncheckedItems = getUncheckedItems(
          sectionConfig.values.uncheckedItems.split(',')
        )
      } else {
        processedUncheckedItems = getUncheckedItems()
      }

      // Process excluded items
      let processedExcludedItems: string[] = []
      if (
        sectionConfig.values.excludedItems.length > 0 &&
        sectionConfig.values.excludedItems.includes(',')
      ) {
        processedExcludedItems = getExcludedItems(
          sectionConfig.values.excludedItems.split(',')
        )
      } else {
        processedExcludedItems = getExcludedItems()
      }

      // Process supported extensions
      let processedSupportedExtensions: string[] = []
      if (
        sectionConfig.values.supportedExtensions.length > 0 &&
        sectionConfig.values.supportedExtensions.includes(',')
      ) {
        processedSupportedExtensions = getSupportedExtensions(
          sectionConfig.values.supportedExtensions.split(',')
        )
      } else {
        processedSupportedExtensions = getSupportedExtensions()
      }

      const changedFiles = removeDuplicates(
        await getChangedFiles(collectionUri, project, repoName, accessToken)
      )

      // Get all files recursively
      const allFiles = getItemsRecursively(
        processedExcludedItems,
        workspacePathPrefix,
        isInitialRun,
        changedFiles,
        processedSupportedExtensions
      )

      if (allFiles.includes('.gitignore')) {
        getGitIgnoreItems(workspacePathPrefix, processedExcludedItems)
      }

      // Filter and process files
      const items = excludeInvalidExtensions(allFiles)

      let itemsToBeIncluded: string[] = items.filter(item => {
        const itemPath = path.normalize(item)
        return !processedExcludedItems.some(excludedItem =>
          itemPath.startsWith(excludedItem + path.sep)
        )
      })

      console.log('changedFiles after duplicate removal ', changedFiles)
      console.log('All items ', allFiles)
      console.log('items final processs', items)

      // Final processing of items
      itemsToBeIncluded = removeDuplicates(
        excludeInvalidExtensions(itemsToBeIncluded)
      )

      processedUncheckedItems = removeDuplicates(
        excludeInvalidExtensions(processedUncheckedItems)
      )

      processedExcludedItems = removeDuplicates(
        excludeInvalidFilesAndFolder(processedExcludedItems).concat(
          DocuGenConstants.excludedItems.split(',')
        )
      )

      processedSupportedExtensions = removeDuplicates(
        processedSupportedExtensions.concat(
          DocuGenConstants.supportedExtensions.split(',')
        )
      )

      // Update section configuration
      sectionConfig.values.includedItems = itemsToBeIncluded.join()
      sectionConfig.values.uncheckedItems = processedUncheckedItems.join()
      sectionConfig.values.excludedItems = processedExcludedItems.join()
      sectionConfig.values.supportedExtensions =
        processedSupportedExtensions.join()

      updateConfigFile(configFilePath, sectionConfig)

      console.log(
        'Generating documentation for selected files: ' + itemsToBeIncluded
      )
      if (itemsToBeIncluded.length > 0) {
        const documentationFilePath =
          sectionConfig.values.defaultDocumentFileName + defaultExtension
        const workspaceDocumentationFilePath =
          workspacePathPrefix + documentationFilePath

        const tempFilePath = workspacePathPrefix + 'docugen-temp.md'
        writeFileSync(tempFilePath, '')

        const docuGen = new DocuGen(getSecretProvider())
        const chunkFilePaths: string[] = []

        for (const file of itemsToBeIncluded) {
          for await (const chunk of docuGen.generateDocumentation(
            workspacePathPrefix,
            processedExcludedItems,
            [file],
            modelEndpoint,
            modelName,
            modelVersion,
            modelProvider
          )) {
            if (chunk.content) {
              await appendToTempFile(tempFilePath, chunk.content)
            }
            chunkFilePaths.push(chunk.filePath)
          }
        }

        const fileContentProvider = new FileContentProvider()
        await fileContentProvider.updateFileContent(
          workspaceDocumentationFilePath,
          tempFilePath,
          chunkFilePaths
        )

        await deleteTempFile(tempFilePath)

        sectionConfig.values.includedItems = ''
        sectionConfig.values.uncheckedItems = removeDuplicates(
          sectionConfig.values.uncheckedItems
            .split(',')
            .concat(itemsToBeIncluded)
        ).join()

        updateConfigFile(configFilePath, sectionConfig)

        // In Azure Pipelines, you might want to use built-in Git tasks for committing
        await commitDocumentationChanges([
          workspaceDocumentationFilePath,
          configFilePath
        ])

        task.setResult(
          task.TaskResult.Succeeded,
          'Documentation generated successfully'
        )
      } else {
        task.setResult(
          task.TaskResult.Succeeded,
          'No eligible files found to generate documentation.'
        )
        console.log('No eligible files found to generate documentation.')
      }
    } else {
      task.setResult(task.TaskResult.Succeeded, 'No action taken')
    }
  } catch (error) {
    task.error(
      error instanceof Error ? error.message : 'An unknown error occurred'
    )
    task.setResult(
      task.TaskResult.Failed,
      error instanceof Error ? error.message : 'Task failed'
    )
  }
}

function validModelConfig(
  modelEndpoint: string | undefined,
  modelName: string | undefined,
  modelVersion: string | undefined,
  modelApiKey: string | undefined
): boolean {
  if (!modelApiKey) {
    task.error('Please define model API key to generate documentation.')
    return false
  }
  if (!modelEndpoint) {
    task.error('Please define model endpoint to generate documentation.')
    return false
  } else if (
    !modelEndpoint ||
    (!modelEndpoint.startsWith('http://') &&
      !modelEndpoint.startsWith('https://'))
  ) {
    task.error(
      'Please define a valid model endpoint to generate documentation.'
    )
    return false
  }
  if (!modelName) {
    task.error('Please define model name to generate documentation.')
    return false
  }
  if (!modelVersion) {
    task.error('Please define model version to generate documentation.')
    return false
  }

  return true
}

run()
