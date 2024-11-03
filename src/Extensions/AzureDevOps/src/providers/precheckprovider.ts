import * as tl from 'azure-pipelines-task-lib/task'
import * as path from 'path'

export function preCheckProvider() {
  // Inform the user that configuration validation is in progress
  console.log('Validating configuration...')

  // Get the input variables
  const systemToken = process.env.SYSTEM_ACCESSTOKEN
  const apiToken = process.env.apiToken
  const modelProvider = process.env.modelProvider
  const modelEndpoint = process.env.modelEndpoint
  const modelName = process.env.modelName

  const collectionUri = tl.getVariable('System.CollectionUri') || ''
  const project = tl.getVariable('System.TeamProject') || ''
  const repoName = tl.getVariable('Build.Repository.Name') || ''

  let message = ''

  tl.debug(
    `System Token Length: ${systemToken ? systemToken.length : 'Not provided'}`
  )
  tl.debug(`Model Provider: ${modelProvider}`)
  tl.debug(`API Token: ${apiToken}`)
  tl.debug(`Model Endpoint: ${modelEndpoint}`)
  tl.debug(`Model Name: ${modelName}`)

  tl.debug('Build context variables:')
  tl.debug(`CollectionUri: ${collectionUri}`)
  tl.debug(`Project: ${project}`)
  tl.debug(`Repository Name: ${repoName}`)
  tl.debug(`Build.SourceVersion: ${tl.getVariable('Build.SourceVersion')}`)
  tl.debug(`Build.Reason: ${tl.getVariable('Build.Reason')}`)
  tl.debug(
    `System.PullRequest.PullRequestId: ${tl.getVariable('System.PullRequest.PullRequestId')}`
  )
  tl.debug(`Build.SourceBranch: ${tl.getVariable('Build.SourceBranch')}`)
  tl.debug(
    `Build.SourceBranchName: ${tl.getVariable('Build.SourceBranchName')}`
  )

  // Check if the input variables are set
  if (!systemToken) {
    message = 'SYSTEM_ACCESSTOKEN is not set'
    throw Error(message)
  }

  if (!apiToken) {
    message = 'apiToken is not set'
    throw Error(message)
  }

  if (!modelProvider) {
    message = 'modelProvider is not set'
    throw Error(message)
  }

  if (!modelEndpoint) {
    message = 'modelEndpoint is not set'
    throw Error(message)
  }

  if (!modelName) {
    message = 'modelName is not set'
    throw Error(message)
  }
}
