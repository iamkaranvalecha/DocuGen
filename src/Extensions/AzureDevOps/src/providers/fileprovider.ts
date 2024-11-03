import * as tl from 'azure-pipelines-task-lib/task'
import * as azdev from 'azure-devops-node-api'
import {
  GitPullRequestSearchCriteria,
  VersionControlChangeType
} from 'azure-devops-node-api/interfaces/GitInterfaces'

export async function getChangedFiles(
  collectionUri: string,
  project: string,
  repoName: string,
  accessToken: string
): Promise<string[]> {
  try {
    // Initialize Azure DevOps API client
    var { pullRequestId, gitApi, repo, isSuccess } = await getPullRequestList(
      collectionUri,
      project,
      repoName,
      accessToken
    )

    let filesChanged: string[] = []
    if (pullRequestId && isSuccess) {
      // = tl.getVariable('System.PullRequest.PullRequestId') || ''
      //   pullRequestId = pullRequests[0].pullRequestId || 0

      // Step 2: Get the latest iteration
      const iterations = await gitApi.getPullRequestIterations(
        repo.name || '',
        pullRequestId,
        project
      )
      const latestIterationId = iterations[iterations.length - 1].id || 0
      //   console.log(`Using latest iteration ID: ${latestIterationId}`)
      // Step 3: Retrieve changes in the latest iteration
      const changes = await gitApi.getPullRequestIterationChanges(
        repo.name || '',
        pullRequestId,
        latestIterationId,
        project
      )

      // Step 4: List changed files
      filesChanged = (changes?.changeEntries
        ?.filter(
          change => change?.changeType !== VersionControlChangeType.Delete
        ) // Exclude deleted files
        .map(change => change?.item?.path) ?? []) as string[]
      console.log('Changed files:', filesChanged)
    }

    if (filesChanged.length > 0) {
      console.log('Changed files:')
      filesChanged.forEach(file => console.log(file))
    } else {
      console.log('No files changed.')
    }

    return filesChanged
  } catch (error) {
    tl.error(`Error getting changed files: ${error}`)
    throw error
  }
}

export async function getPullRequestList(
  collectionUri: string,
  project: string,
  repoName: string,
  accessToken: string
) {
  let isSuccess = true
  const authHandler = azdev.getPersonalAccessTokenHandler(accessToken)
  const connection = new azdev.WebApi(collectionUri, authHandler)
  const gitApi = await connection.getGitApi()

  // Get repository ID
  const repos = await gitApi.getRepositories(project)
  const repo = repos.find(r => r.name === repoName)

  if (!repo || !repo.id) {
    throw new Error(`Repository ${repoName} not found or ID is undefined`)
  }

  // Check if we're in a PR context
  let pullRequestId
  const sourceBranch = tl.getVariable('Build.SourceBranch')

  // https://learn.microsoft.com/en-us/javascript/api/azure-devops-extension-api/pullrequeststatus
  const searchCriteria: GitPullRequestSearchCriteria = {
    sourceRefName: sourceBranch,
    status: 1
  }

  // Fetch pull requests for the repository
  const pullRequests = await gitApi.getPullRequests(
    repoName,
    searchCriteria,
    project
  )

  if (pullRequests.length > 0) {
    pullRequestId = pullRequests[0].pullRequestId
    console.log(`Found Pull Request ID: ${pullRequestId}`)
    pullRequestId = pullRequestId?.toString() || ''
    isSuccess = true
  } else {
    isSuccess = false
  }
  return { pullRequestId, gitApi, repo, isSuccess }
}
