import * as core from '@actions/core'
import * as path from 'path'
import * as fs from 'fs'

export function preCheckProvider() {
  // Get the target directory input (optional)
  // const targetDirectory = core.getInput('target-directory') || './'

  // Get the GitHub token to authenticate API requests
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN is not set')
  }
  // Get the GitHub token to authenticate API requests
  const apiToken = core.getInput('api-key') || process.env.API_KEY
  if (!apiToken) {
    throw new Error('API_KEY is not set')
  }
  const modelProvider = core.getInput('modelProvider')
  if (modelProvider == null) {
    throw new Error('modelProvider is not set')
  }

  const modelEndpoint = core.getInput('modelEndpoint')
  if (!modelEndpoint) {
    throw new Error('modelEndpoint is not set')
  }

  const modelName = core.getInput('modelName')
  if (!modelName) {
    throw new Error('modelName is not set')
  }
}

export enum provider {
  github = 'github-token',
  api = 'api-key'
}
