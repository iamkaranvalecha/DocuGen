import * as core from '@actions/core'

export async function getPRFiles(
  pullRequest:
    | { [key: string]: any; number: number; html_url?: string; body?: string }
    | undefined,
  octokit: any,
  owner: string,
  repo: string,
  context: any
) {
  let filesChanged

  if (pullRequest) {
    // Get the changed files for a pull request
    const { data: pullRequestFiles } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullRequest.number
    })

    // Ignore deleted files
    filesChanged = pullRequestFiles.filter(file => file.status !== 'removed')

    filesChanged = filesChanged.map((file: { filename: any }) => file.filename)
  } else if (context.eventName === 'push') {
    // Get the changed files for a push event
    const before = context.payload.before
    const after = context.payload.after

    const { data: compareCommits } = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: before,
      head: after
    })

    filesChanged = compareCommits.files
      ?.filter(file => file.status !== 'removed')
      .map((file: { filename: any }) => file.filename)
  }

  if (filesChanged && filesChanged.length > 0) {
    core.info('Changed files:')
    filesChanged.forEach((file: any) => core.info(file))
    filesChanged
  } else {
    core.info('No files changed.')
  }

  return filesChanged
}
