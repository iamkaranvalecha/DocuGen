import * as core from '@actions/core'
import { ISecretProvider } from 'docugen'

export class GitHubActionSecretProvider implements ISecretProvider {
  async getSecret(key: string): Promise<string | undefined> {
    return core.getInput('api-key')
  }
}
