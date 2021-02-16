#!/usr/bin/env node

import { intersection, map, property, split } from '@dword-design/functions'
import packageName from 'depcheck-package-name'
import execa from 'execa'
import makeCli from 'make-cli'
import { readFileSync as safeReadFileSync } from 'safe-readfile'

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
          const filenames =
            execa.command('git diff --name-only --staged', {
              all: true,
            })
            |> await
            |> property('all')
            |> split('\n')
          if (filenames.length > 0) {
            const commitType =
              (filenames |> intersection(releasedFiles) |> property('length')) >
              0
                ? 'fix'
                : 'chore'
            await execa(
              'git',
              ['commit', '-m', `${commitType}: update changed files`],
              { stdio: 'inherit' }
            )
            await execa.command('git push', { stdio: 'inherit' })
          }
        },
        name: 'push-changed-files [remoteUrl]',
      },
      {
        // coverallsapp/github-action does not wirk with empty lcov.info files
        handler: async () => {
          const content = safeReadFileSync('./coverage/lcov.info', 'utf8') || ''
          if (content !== '') {
            const childProcess = execa.command(
              `yarn ${packageName`coveralls`}`,
              { stdio: ['pipe', 'inherit', 'inherit'] }
            )
            childProcess.stdin.write(content)
            childProcess.stdin.end()
            await childProcess
          }
        },
        name: 'coveralls',
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
