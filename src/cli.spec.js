import withLocalTmpDir from 'with-local-tmp-dir'
import execa from 'execa'
import P from 'path'
import { ensureDir, outputFile } from 'fs-extra'
import outputFiles from 'output-files'
import { endent, mapValues } from '@dword-design/functions'

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
}
  |> mapValues(({ files, test }) => () => withLocalTmpDir(
    async () => {
      ensureDir('remote') |> await
      process.chdir('remote')
      execa.command('git init --bare') |> await
      process.chdir('..')
      execa.command('git clone remote local') |> await
      process.chdir('local')
      outputFile('.gitkeep', '') |> await
      execa.command('git add .') |> await
      execa.command('git commit -m "init"') |> await
      execa.command('git push origin master') |> await
      outputFiles(files) |> await
      execa(require.resolve('./cli'), ['push-changed-files', P.join('..', 'remote')]) |> await
      const { all } = execa.command('git log -n 1', { all: true }) |> await
      test(all)
    },
  ))
