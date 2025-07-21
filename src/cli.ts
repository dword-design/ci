#!/usr/bin/env node

import { intersection } from 'lodash-es'
import { execa, execaCommand } from 'execa'
import makeCli from 'make-cli'

import releasedFiles from './released-files'
try {
  makeCli({
    commands: {
      'push-changed-files [remoteUrl]': {
        handler: async (
          remoteUrl = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}`,
        ) => {
          await execaCommand(`git remote set-url origin ${remoteUrl}`, {
            stdio: 'inherit',
          })
          await execaCommand('git add .', { stdio: 'inherit' })

          const { all: output } =
            await execaCommand('git diff --name-only --staged', {
              all: true,
            })
          const filenames = output === '' ? [] : output.split('\n');
          if (filenames.length > 0) {
            const commitType =
              intersection(filenames, releasedFiles).length >
              0
                ? 'fix'
                : 'chore'
            await execa(
              'git',
              ['commit', '-m', `${commitType}: update config files`],
              { stdio: 'inherit' },
            )
            await execaCommand('git push', { stdio: 'inherit' })
          }
        },
      },
    },
  })
} catch (error) {
  console.log(error)
  process.exit(1)
}
