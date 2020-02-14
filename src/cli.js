#!/usr/bin/env node

import makeCli from 'make-cli'
import execa from 'execa'
import { readFileSync as safeReadFileSync } from 'safe-readfile'
import { map } from '@dword-design/functions'

makeCli({
  commands: [
    {
      name: 'push-changed-files',
      handler: async () => {
        await execa.command('git config --local user.email "actions@github.com"', { stdio: 'inherit' })
        await execa.command('git config --local user.name "GitHub Actions"', { stdio: 'inherit' })
        await execa.command(`git remote set-url origin https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}`, { stdio: 'inherit' })
        await execa.command('git add .', { stdio: 'inherit' })
        try {
          await execa.command('git commit -m "Update\\ changed\\ files" --no-verify', { stdio: 'inherit' })
        } catch {
          console.log('Continuing …')
        }
        await execa.command('git pull', { stdio: 'inherit' })
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