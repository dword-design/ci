#!/usr/bin/env node

import { intersection, map, property, split } from '@dword-design/functions'
import { execa, execaCommand } from 'execa'
import makeCli from 'make-cli'

import releasedFiles from './released-files.js'

makeCli({
  commands:
    [
      {
        handler: async (
          remoteUrl = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}`,
        ) => {
          await execaCommand(`git remote set-url origin ${remoteUrl}`, {
            stdio: 'inherit',
          })
          await execaCommand('git add .', { stdio: 'inherit' })

          const filenames =
            execaCommand('git diff --name-only --staged', {
              all: true,
            })
            |> await
            |> property('all')
            |> (text => (text === '' ? [] : text |> split('\n')))
          if (filenames.length > 0) {
            const commitType =
              (filenames |> intersection(releasedFiles) |> property('length')) >
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
        name: 'push-changed-files [remoteUrl]',
      },
    ]
    |> map(command => ({
      ...command,
      handler: async (...args) => {
        try {
          return command.handler(...args) |> await
        } catch (error) {
          console.log(error)
          process.exit(1)

          return undefined
        }
      },
    })),
})
