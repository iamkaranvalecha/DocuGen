import * as core from '@actions/core'
import * as io from '@actions/io'
import * as fs from 'fs'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import { Enums, SectionConfig } from 'docugen'
import { Constants } from './constant'
import { readConfigFile } from './utilities'
import path from 'path'

export async function commitDocumentationChanges(filePaths: string[]) {
  try {
    configureGitAuthor()

    // Check if the file exists
    for (var filePath in filePaths) {
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      }
    }

    await addToGit(filePaths)

    await pushToGit()

    // Optionally, add a comment to the PR
    const token = core.getInput('github-token')
    const octokit = github.getOctokit(token)
    const { owner, repo } = github.context.repo
    const prNumber = github.context.issue.number

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: Constants.commitMessage
    })

    core.info('PR comment added.')
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

export function writeContentToFile(filePath: string, content: string) {
  // Write content to the file (overwrite or create if not exists)
  fs.writeFileSync(filePath, content)
  core.info(`File ${filePath} created/updated with content.`)
}

async function configureGitAuthor() {
  await exec.exec('git', [
    'config',
    '--global',
    'user.email',
    '"you@example.com"'
  ])
  await exec.exec('git', ['config', '--global', 'user.name', '"Docugen"'])
}

export function writeConfigFile(filePath: string, sections: SectionConfig[]) {
  if (sections !== undefined && sections.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(sections, null, 2), 'utf-8')
    core.info(`File ${filePath} created/updated with content.`)
    //addToGit(filePath)
  } else {
    throw new Error('Sections are undefined')
  }
}

export function updateConfigFile(filePath: string, section: SectionConfig) {
  if (section !== undefined) {
    if (fs.existsSync(filePath)) {
      const existingSectionsWithoutVSCode = readConfigFile(filePath).filter(
        x => x.name !== Enums.GitHubActions
      )
      existingSectionsWithoutVSCode.push(section)

      writeConfigFile(filePath, existingSectionsWithoutVSCode)
    } else {
      writeConfigFile(filePath, [section])
    }
  } else {
    throw new Error('Section is undefined')
  }
}

async function addToGit(filePaths: string[]) {
  // Add the file to Git
  await exec.exec('git', ['add', filePaths.join(' ')])
}

async function pushToGit() {
  // Commit the change
  await exec.exec('git', ['commit', '-m', Constants.commitMessage])

  // Get the PR branch from the GitHub Actions context
  const prBranch = github.context.payload.pull_request?.head.ref

  if (!prBranch) {
    throw new Error('Pull request branch not found')
  }

  // Pull the latest changes from the remote branch to avoid conflicts
  await exec.exec('git', ['pull', 'origin', prBranch, '--rebase'])

  // Push to the pull request branch
  await exec.exec('git', ['push', 'origin', `HEAD:${prBranch}`])
  console.log(`Changes pushed to branch ${prBranch}.`)
}
