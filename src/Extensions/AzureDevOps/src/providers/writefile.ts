import * as task from 'azure-pipelines-task-lib/task'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as azdev from 'azure-devops-node-api'
import { Constants } from './constant'
import { Enums, SectionConfig } from 'docugen'
import { readConfigFile } from './utilities'

// Promisify exec for easier async handling
const execAsync = promisify(exec)

export async function commitDocumentationChanges(filePaths: string[]) {
  try {
    await configureGitAuthor()

    // Ensure directories exist
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      }
    }

    await addToGit(filePaths)
    await pushToGit()

    // Add PR comment using Azure DevOps API
    const personalAccessToken = process.env.SYSTEM_ACCESSTOKEN
    const organizationUrl = task.getVariable('System.CollectionUri')
    const projectName = task.getVariable('System.TeamProject')
    const pullRequestId = parseInt(
      task.getVariable('System.PullRequest.PullRequestId') || '0'
    )
    const repositoryName = task.getVariable('Build.Repository.Name')

    if (personalAccessToken && organizationUrl && pullRequestId) {
      const authHandler =
        azdev.getPersonalAccessTokenHandler(personalAccessToken)
      const connection = new azdev.WebApi(organizationUrl, authHandler)
      const gitApi = await connection.getGitApi()

      await gitApi.createThread(
        {
          comments: [{ content: Constants.commitMessage }]
        },
        repositoryName || '',
        pullRequestId,
        projectName || ''
      )

      const message = `Comment added successfully. Type: Information`
      console.log(`PR Comment: ${message}`)
    }

    task.setResult(
      task.TaskResult.Succeeded,
      'Documentation changes committed successfully'
    )
  } catch (error) {
    task.setResult(
      task.TaskResult.Failed,
      error instanceof Error ? error.message : String(error)
    )
  }
}

export function writeContentToFile(filePath: string, content: string) {
  try {
    fs.writeFileSync(filePath, content)
  } catch (error) {
    task.setResult(task.TaskResult.Failed, `Error writing to file: ${error}`)
  }
}

async function configureGitAuthor() {
  try {
    await execAsync('git config --global user.email "DocuGenAI@outlook.com"')
    await execAsync('git config --global user.name "Docugen AI"')
  } catch (error) {
    task.warning(`Git author configuration failed: ${error}`)
  }
}

export async function writeConfigFile(
  filePath: string,
  sections: SectionConfig[]
) {
  if (sections && sections.length > 0) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(sections, null, 2), 'utf-8')
      const { stdout, stderr } = await execAsync('git status')
      console.log('Output:', stdout)
    } catch (error) {
      task.setResult(
        task.TaskResult.Failed,
        `Error writing config file: ${error}`
      )
    }
  } else {
    throw new Error('Sections are undefined')
  }
}

export function writeFileSync(filePath: string, content: string) {
  fs.writeFileSync(filePath, content, 'utf-8')
}

export async function appendToTempFile(
  tempFilePath: string,
  content: string
): Promise<void> {
  try {
    await fs.promises.appendFile(tempFilePath, content)
  } catch (error) {
    task.error(`Error appending to temporary file: ${error}`)
    throw error
  }
}

export async function deleteTempFile(tempFilePath: string): Promise<void> {
  try {
    if (fs.existsSync(tempFilePath)) {
      await fs.promises.unlink(tempFilePath)
    }
  } catch (error) {
    task.warning(`Error cleaning up temporary file: ${error}`)
  }
}

export function updateConfigFile(filePath: string, section: SectionConfig) {
  if (section !== undefined) {
    try {
      let existingSections: SectionConfig[] = []

      if (fs.existsSync(filePath)) {
        existingSections = readConfigFile(filePath).filter(
          x => x.name !== Enums.DevOps
        )
      }

      existingSections.push(section)
      writeConfigFile(filePath, existingSections)
    } catch (error) {
      task.setResult(
        task.TaskResult.Failed,
        `Error updating config file: ${error}`
      )
    }
  } else {
    throw new Error('Section is undefined')
  }
}

async function addToGit(filePaths: string[]) {
  try {
    await execAsync('git status')
    await execAsync('dir')
    await execAsync(`git add ${filePaths.join(' ')}`)
  } catch (error) {
    const { stdout, stderr } = await execAsync('dir')
    console.log('Output:', stdout)
    console.log('Output paths:', filePaths)
    task.warning(`Error adding files to git: ${error}`)
    throw error
  }
}

async function pushToGit() {
  try {
    // Get source branch from Azure DevOps variables
    const sourceBranch = task.getVariable('Build.SourceBranch')

    if (!sourceBranch) {
      throw new Error('Pull request branch not found')
    }

    // Extract branch name (remove refs/heads/ prefix)
    const prBranch = sourceBranch.replace(/^refs\/heads\//, '')

    // Commit changes
    await execAsync(`git commit -m "${Constants.commitMessage} [skip ci]"`)

    // Pull latest changes with rebase
    await execAsync(`git pull origin ${prBranch} --rebase`)

    // Push to the source branch
    await execAsync(`git push origin HEAD:${prBranch}`)

    // task.logDetail('Git Push', {
    //   message: `Changes pushed to branch ${prBranch}`,
    //   type: task.LogDetailType.Information
    // });
  } catch (error) {
    task.warning(`Error during git push: ${error}`)
    throw error
  }
}
