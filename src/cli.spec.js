import { endent, mapValues } from '@dword-design/functions'
import execa from 'execa'
import { ensureDir, outputFile } from 'fs-extra'
import outputFiles from 'output-files'
import P from 'path'
import withLocalTmpDir from 'with-local-tmp-dir'

const runTest = config => () =>
  withLocalTmpDir(async () => {
    await ensureDir('remote')
    process.chdir('remote')
    await execa.command('git init --bare')
    process.chdir('..')
    await execa.command('git clone remote local')
    process.chdir('local')
    await outputFile('.gitkeep', '')
    await execa.command('git add .')
    await execa.command('git commit -m "init"')
    await execa.command('git push origin master')
    await outputFiles(config.files)
    await execa(require.resolve('./cli'), [
      'push-changed-files',
      P.join('..', 'remote'),
    ])
    const output = await execa.command('git log -n 1', { all: true })
    config.test(output.all)
  })

export default {
  'released files': {
    files: {
      'package.json': endent`
        {
          "name": "foo"
        }
      `,
    },
    test: all => expect(all).toMatch('fix(config):'),
  },
  'unreleased files': {
    files: {
      '.gitpod.yml': '',
    },
    test: all => expect(all).toMatch('chore(config):'),
  },
} |> mapValues(runTest)
