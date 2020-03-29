#!/usr/bin/env node

import makeCli from 'make-cli'
import execa from 'execa'
import { readFileSync as safeReadFileSync } from 'safe-readfile'
import { map, split, intersection } from '@dword-design/functions'
import releasedFiles from './released-files.json'

makeCli({
  commands: [
    {
      name: 'push-changed-files [remoteUrl]',
      handler: async (remoteUrl = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}`) => {
        await execa.command('git config --local user.email "actions@github.com"', { stdio: 'inherit' })
        await execa.command('git config --local user.name "GitHub Actions"', { stdio: 'inherit' })
        await execa.command(`git remote set-url origin ${remoteUrl}`, { stdio: 'inherit' })
        await execa.command('git add .', { stdio: 'inherit' })

        const { all: changedFilesString } = await execa.command('git diff --name-only --staged', { all: true })
        const commitType = (changedFilesString |> split('\n') |> intersection(releasedFiles)).length > 0 ? 'fix' : 'chore'

        try {
          await execa('git', ['commit', '-m', `${commitType}(config): Update changed files`], { stdio: 'inherit' })
        } catch {
          console.log('Continuing …')
        }
        await execa.command('git pull --rebase', { stdio: 'inherit' })
        await execa.command('git push', { stdio: 'inherit' })
      },
    },
    {
      name: 'coveralls',
      handler: async () => {
        const content = safeReadFileSync('./coverage/lcov.info', 'utf8') ?? ''
        if (content !== '') {
          await execa.command('yarn add coveralls', { stdio: 'inherit' })
          const childProcess = execa.command('yarn coveralls', { stdio: ['pipe', 'inherit', 'inherit'] })
          childProcess.stdin.write(content)
          childProcess.stdin.end()
          await childProcess
        }
      },
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
        }
      },
    })),
})
