import { ISecretProvider } from 'docugen'

export class DevOpsSecretProvider implements ISecretProvider {
  async getSecret(key: string): Promise<string | undefined> {
    return key === 'apiToken' ? process.env.apiToken : undefined
  }
}
