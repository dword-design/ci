import { identity, mapValues } from '@dword-design/functions'
import { execa, execaCommand } from 'execa'
import fs, { ensureDir } from 'fs-extra'
import { createRequire } from 'module'
import outputFiles from 'output-files'
import P from 'path'
import withLocalTmpDir from 'with-local-tmp-dir'

const _require = createRequire(import.meta.url)

const runTest = config => () => {
  config = { files: {}, test: identity, ...config }

  return withLocalTmpDir(async () => {
    await fs.outputFile('package.json', JSON.stringify({ type: 'module' }))
    await ensureDir('remote')
    process.chdir('remote')
    await execaCommand('git init --bare')
    process.chdir('..')
    await execaCommand('git clone remote local')
    process.chdir('local')
    await execaCommand('git config user.email "foo@bar.de"')
    await execaCommand('git config user.name "foo"')
    await execaCommand('git commit --allow-empty -m "init"')
    await execaCommand('git push')
    await outputFiles(config.files)
    await execa(_require.resolve('./cli.js'), [
      'push-changed-files',
      P.join('..', 'remote'),
    ])

    const output = await execaCommand('git log -n 1', { all: true })
    config.test(output.all)
  })
}

export default {
  'no changes': {},
  'released files': {
    files: {
      'package.json': JSON.stringify({ name: 'changed', type: 'module' }),
    },
    test: all => expect(all).toMatch('fix:'),
  },
  'unreleased files': {
    files: {
      '.gitpod.yml': '',
    },
    test: all => expect(all).toMatch('chore:'),
  },
} |> mapValues(runTest)
