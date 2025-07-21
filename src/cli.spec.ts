import { createRequire } from 'node:module';
import pathLib from 'node:path';

import defu from '@dword-design/defu';
import { expect, test } from '@playwright/test';
import { execa, execaCommand } from 'execa';
import fs, { ensureDir } from 'fs-extra';
import type { Files } from 'output-files';
import outputFiles from 'output-files';

const resolver = createRequire(import.meta.url);

type TestConfig = { files?: Files; test?: (all: string) => unknown };

const tests: Record<string, TestConfig> = {
  'no changes': {},
  'released files': {
    files: {
      'package.json': JSON.stringify({ name: 'changed', type: 'module' }),
    },
    test: all => expect(all).toMatch('fix:'),
  },
  'unreleased files': {
    files: { '.gitpod.yml': '' },
    test: all => expect(all).toMatch('chore:'),
  },
};

for (const [name, _testConfig] of Object.entries(tests)) {
  const testConfig = defu(_testConfig, { files: {}, test: () => {} });

  test(name, async ({}, testInfo) => {
    const cwd = testInfo.outputPath();

    await fs.outputFile(
      pathLib.join(cwd, 'package.json'),
      JSON.stringify({ type: 'module' }),
    );

    const remoteDir = pathLib.join(cwd, 'remote');
    await ensureDir(remoteDir);
    await execaCommand('git init --bare', { cwd: remoteDir });
    await execaCommand('git clone remote local', { cwd });
    const localDir = pathLib.join(cwd, 'local');
    await execaCommand('git config user.email "foo@bar.de"', { cwd: localDir });
    await execaCommand('git config user.name "foo"', { cwd: localDir });
    await execaCommand('git commit --allow-empty -m "init"', { cwd: localDir });
    await execaCommand('git push', { cwd: localDir });
    await outputFiles(localDir, testConfig.files);

    await execa(
      'tsx',
      [resolver.resolve('./cli.ts'), 'push-changed-files', remoteDir],
      { cwd: localDir },
    );

    const output = await execaCommand('git log -n 1', {
      all: true,
      cwd: localDir,
    });

    testConfig.test(output.all);
  });
}
