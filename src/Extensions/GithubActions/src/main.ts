import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  configFileExists,
  excludeInvalidExtensions,
  excludeInvalidFilesAndFolder,
  getPRFiles,
  getExcludedItems,
  getGitIgnoreItems,
  getItemsRecursively,
  getSecretProvider,
  getSupportedExtensions,
  getUncheckedItems,
  preCheckProvider,
  readConfigFile,
  removeDuplicates
} from './providers'
import {
  commitDocumentationChanges,
  updateConfigFile,
  writeConfigFile
} from './providers/writefile'
import {
  DocuGen,
  Constants as DocuGenConstants,
  Enums,
  SectionConfig,
  ModelProviderEnums
} from 'docugen'
import path from 'path'
import { Constants } from './providers/constant'

const defaultExtension: string = '.md'
const extensionName = DocuGenConstants.extensionName.toLowerCase()
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    preCheckProvider()

    const eventName = process.env.GITHUB_EVENT_NAME
    const eventPath = process.env.GITHUB_EVENT_PATH
    const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request'
    const isMerged =
      process.env.GITHUB_EVENT_ACTION === 'closed' &&
      process.env.GITHUB_EVENT_PULL_REQUEST_MERGE_STATUS === 'merged'

    if (isPR && !isMerged) {
      // Run your CI code here

      // Get the GitHub token and set up the octokit client
      const token = core.getInput('github-token', { required: true })
      const octokit = github.getOctokit(token)

      // Get the context
      const context = github.context

      // Get the pull request or push event info
      const pullRequest = context.payload.pull_request
      const owner = context.repo.owner
      const repo = context.repo.repo

      // Get the current working directory
      const workspaceFsPath = process.cwd()
      core.info(`Current working directory: ${workspaceFsPath}`)

      if (workspaceFsPath !== undefined) {
        const modelEndpoint =
          (core.getInput('modelEndpoint') as string) ?? undefined
        const modelName = (core.getInput('modelName') as string) ?? undefined
        let modelVersion =
          (core.getInput('modelVersion') as string) ?? undefined
        const modelApiKey = core.getInput('api-key') ?? undefined
        const modelProvider = core.getInput(
          'modelProvider'
        ) as ModelProviderEnums
        if (modelProvider) {
          modelVersion = 'default'
        }
        if (
          validModelConfig(modelEndpoint, modelName, modelVersion, modelApiKey)
        ) {
          const workspacePathPrefix = workspaceFsPath + path.sep
          const configFilePath =
            workspacePathPrefix + DocuGenConstants.configFileName
          let isInitialRun = false
          let sectionConfig = new SectionConfig(
            Enums.GitHubActions,
            extensionName,
            DocuGenConstants.excludedItems,
            '',
            '',
            DocuGenConstants.supportedExtensions
          )

          if (!configFileExists(configFilePath)) {
            const existingSections = readConfigFile(configFilePath)
            existingSections.push(sectionConfig)
            isInitialRun = true
            writeConfigFile(configFilePath, existingSections)
          } else {
            const sectionFromConfig = readConfigFile(configFilePath).filter(
              x => x.name === Enums.GitHubActions
            )
            if (sectionFromConfig.length > 0) {
              sectionConfig = sectionFromConfig[0]
            }
          }

          sectionConfig.values.excludedItems = [
            sectionConfig.values.excludedItems,
            core.getInput('excludedItems')
          ]
            .filter(item => item && item.trim() !== '')
            .join(',')

          sectionConfig.values.uncheckedItems = [
            sectionConfig.values.uncheckedItems,
            core.getInput('uncheckedItems')
          ]
            .filter(item => item && item.trim() !== '')
            .join(',')

          sectionConfig.values.supportedExtensions = [
            sectionConfig.values.supportedExtensions,
            core.getInput('supportedExtensions')
          ]
            .filter(item => item && item.trim() !== '')
            .join(',')

          let uncheckedItems: string[] = []
          if (
            sectionConfig.values.uncheckedItems.length > 0 &&
            sectionConfig.values.uncheckedItems.includes(',')
          ) {
            uncheckedItems = getUncheckedItems(
              sectionConfig.values.uncheckedItems.split(',')
            )
          } else {
            uncheckedItems = getUncheckedItems()
          }

          let excludedItems: string[] = []
          if (
            sectionConfig.values.excludedItems.length > 0 &&
            sectionConfig.values.excludedItems.includes(',')
          ) {
            excludedItems = getExcludedItems(
              sectionConfig.values.excludedItems.split(',')
            )
          } else {
            excludedItems = getExcludedItems()
          }

          let supportedExtensions: string[] = []
          if (
            sectionConfig.values.supportedExtensions.length > 0 &&
            sectionConfig.values.supportedExtensions.includes(',')
          ) {
            supportedExtensions = getSupportedExtensions(
              sectionConfig.values.supportedExtensions.split(',')
            )
          } else {
            supportedExtensions = getSupportedExtensions()
          }

          const changedFiles = removeDuplicates(
            await getPRFiles(pullRequest, octokit, owner, repo, context)
          )

          core.info('Changed files: ' + changedFiles)

          const allFiles = getItemsRecursively(
            excludedItems,
            workspaceFsPath,
            isInitialRun,
            changedFiles
          )

          if (allFiles.includes('.gitignore')) {
            getGitIgnoreItems(workspaceFsPath, excludedItems)
          }

          // Get all directories and files recursively
          const items = excludeInvalidExtensions(allFiles)

          let itemsToBeIncluded: string[] = items
            .filter(item => !uncheckedItems.includes(item))
            .filter(item => {
              const itemPath = path.normalize(item)

              return !excludedItems.some(excludedItem =>
                itemPath.startsWith(excludedItem + path.sep)
              )
            })

          // Update the configuration with the selected items
          itemsToBeIncluded = removeDuplicates(
            excludeInvalidExtensions(itemsToBeIncluded)
          )

          uncheckedItems = removeDuplicates(
            excludeInvalidExtensions(uncheckedItems)
          )

          excludedItems = removeDuplicates(
            excludeInvalidFilesAndFolder(excludedItems).concat(
              DocuGenConstants.excludedItems.split(',')
            )
          )

          supportedExtensions = removeDuplicates(
            supportedExtensions.concat(
              DocuGenConstants.supportedExtensions.split(',')
            )
          )

          sectionConfig.values.includedItems = itemsToBeIncluded.join()
          sectionConfig.values.uncheckedItems = uncheckedItems.join()
          sectionConfig.values.excludedItems = excludedItems.join()
          sectionConfig.values.supportedExtensions = supportedExtensions.join()

          updateConfigFile(configFilePath, sectionConfig)

          core.info(
            'Generating documentation for selected files...' + itemsToBeIncluded
          )

          const modelEndpoint = core.getInput('modelEndpoint') as string
          const modelName = core.getInput('modelName')
          const modelVersion = core.getInput('modelVersion')
          const modelProvider = core.getInput(
            'modelProvider'
          ) as ModelProviderEnums
          const documentationFilePath =
            workspacePathPrefix +
            sectionConfig.values.defaultDocumentFileName +
            defaultExtension

          const documentation = await new DocuGen(
            getSecretProvider()
          ).generateDocumentation(
            workspacePathPrefix,
            excludedItems,
            supportedExtensions,
            itemsToBeIncluded,
            documentationFilePath,
            modelEndpoint,
            modelName,
            modelVersion,
            modelProvider
          )

          await commitDocumentationChanges(documentationFilePath, documentation)
        }
      }

      core.setOutput(
        'time',
        'Process completed on ' + new Date().toTimeString()
      )
    } else {
      // Skip CI code
      core.info(Constants.prEventSkippedReason)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function validModelConfig(
  modelEndpoint: string,
  modelName: string,
  modelVersion: string,
  modelApiKey: string
): boolean {
  if (modelApiKey === undefined || modelApiKey === '') {
    core.setFailed('Please define model API key to generate documentation.')
    return false
  }
  if (modelEndpoint === undefined || modelEndpoint === '') {
    core.setFailed('Please define model endpoint to generate documentation.')
    return false
  } else if (!modelEndpoint.includes('https://')) {
    core.setFailed(
      'Please define a valid model endpoint to generate documentation.'
    )
    return false
  }
  if (modelName === undefined || modelName === '') {
    core.setFailed('Please define model name to generate documentation.')
    return false
  }
  if (modelVersion === undefined || modelVersion === '') {
    core.setFailed('Please define model version to generate documentation.')
    return false
  }

  return true
}
