#!/usr/bin/env node

import { intersection, map, split } from '@dword-design/functions'
import execa from 'execa'
import makeCli from 'make-cli'

import releasedFiles from './released-files.json'

makeCli({
  commands:
    [
      {
        handler: async (
          remoteUrl = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}`
        ) => {
          await execa.command(`git remote set-url origin ${remoteUrl}`, {
            stdio: 'inherit',
          })
          await execa.command('git add .', { stdio: 'inherit' })
          const output = await execa.command('git diff --name-only --staged', {
            all: true,
          })
          const commitType =
            (output.all |> split('\n') |> intersection(releasedFiles)).length >
            0
              ? 'fix'
              : 'chore'
          try {
            await execa(
              'git',
              ['commit', '-m', `${commitType}(config): Update changed files`],
              { stdio: 'inherit' }
            )
          } catch {
            console.log('Continuing …')
          }
          await execa.command('git push', { stdio: 'inherit' })
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
