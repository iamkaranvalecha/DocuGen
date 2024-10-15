import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from '../src/main'
import {
  DocuGen,
  SectionConfig,
  Enums,
  Constants as DocuGenConstants
} from 'docugen'
import path from 'path'

// Mock the @actions/core and @actions/github modules
jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('docugen')

describe('GitHub Action - run function', () => {
  const mockGetInput = core.getInput as jest.MockedFunction<
    typeof core.getInput
  >
  const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<
    typeof core.getBooleanInput
  >
  const mockSetFailed = core.setFailed as jest.MockedFunction<
    typeof core.setFailed
  >
  const mockInfo = core.info as jest.MockedFunction<typeof core.info>
  const mockDebug = core.debug as jest.MockedFunction<typeof core.debug>
  const mockGetOctokit = github.getOctokit as jest.MockedFunction<
    typeof github.getOctokit
  >
  const mockContext = github.context

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should run successfully with valid inputs', async () => {
    // Mock inputs
    mockGetInput.mockImplementation((name: string) => {
      switch (name) {
        case 'github-token':
          return 'fake-token'
        case 'api-key':
          return 'fake-api-key'
        case 'modelEndpoint':
          return 'https://fake-endpoint'
        case 'modelName':
          return 'fake-model'
        case 'modelVersion':
          return 'v1'
        case 'useOllama':
          return 'true'
        default:
          return ''
      }
    })

    mockGetBooleanInput.mockImplementation((name: string) => {
      return name === 'useOllama'
    })

    // Mock GitHub context
    mockContext.payload = {
      pull_request: {
        number: 1
      }
    }
    jest.spyOn(mockContext, 'repo', 'get').mockReturnValue({
      owner: 'fake-owner',
      repo: 'fake-repo'
    })

    // Mock Octokit
    mockGetOctokit.mockReturnValue({
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({
            data: [{ filename: 'file1.md' }, { filename: 'file2.md' }]
          })
        }
      }
    } as any)

    // Mock DocuGen
    const mockGenerateDocumentation = jest
      .fn()
      .mockResolvedValue('Generated documentation')
    ;(DocuGen as jest.Mock).mockImplementation(() => {
      return {
        generateDocumentation: mockGenerateDocumentation
      }
    })

    await run()

    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringContaining('Current working directory:')
    )
    expect(mockGenerateDocumentation).toHaveBeenCalled()
    expect(mockSetFailed).not.toHaveBeenCalled()
  })

  it('should fail if required inputs are missing', async () => {
    // Mock inputs
    mockGetInput.mockImplementation((name: string) => {
      switch (name) {
        case 'github-token':
          return ''
        default:
          return ''
      }
    })

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Please define model API key to generate documentation.'
      )
    )
  })

  it('should fail if model configuration is invalid', async () => {
    // Mock inputs
    mockGetInput.mockImplementation((name: string) => {
      switch (name) {
        case 'github-token':
          return 'fake-token'
        case 'api-key':
          return ''
        case 'modelEndpoint':
          return 'invalid-endpoint'
        case 'modelName':
          return ''
        case 'modelVersion':
          return ''
        default:
          return ''
      }
    })

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Please define model API key to generate documentation.'
      )
    )
    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Please define model endpoint to generate documentation.'
      )
    )
    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Please define model name to generate documentation.'
      )
    )
    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Please define model version to generate documentation.'
      )
    )
  })
})
