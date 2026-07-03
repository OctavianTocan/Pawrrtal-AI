/** Package-boundary tests for the 006 Effect TS split. */

import { assert, describe, it } from '@effect/vitest';

type BoundaryRule = {
  readonly root: string;
  readonly disallowed: readonly string[];
};

const rules: readonly BoundaryRule[] = [
  {
    root: 'backend-ts/packages/domain-core/src',
    disallowed: ['@pawrrtal/api-core', '@pawrrtal/rpc-core', '@pawrrtal/harness', '@pawrrtal/api', '@pawrrtal/rpc']
  },
  {
    root: 'backend-ts/packages/api-core/src',
    disallowed: ['@pawrrtal/rpc-core', '@pawrrtal/harness', '@pawrrtal/api', '@pawrrtal/rpc']
  },
  {
    root: 'backend-ts/packages/rpc-core/src',
    disallowed: ['@pawrrtal/api-core', '@pawrrtal/harness', '@pawrrtal/api', '@pawrrtal/rpc']
  },
  {
    root: 'backend-ts/packages/harness/src',
    disallowed: ['@pawrrtal/api-core', '@pawrrtal/rpc-core', '@pawrrtal/api', '@pawrrtal/rpc']
  }
];

/** Lists TypeScript files under one package root. */
const listTypeScriptFiles = async (root: string): Promise<readonly string[]> => {
  const glob = new Bun.Glob('**/*.ts');
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: root, absolute: true })) {
    files.push(file);
  }
  return files;
};

describe('backend-ts package boundaries', (): void => {
  it('keeps shared contracts and harness imports pointed inward', async (): Promise<void> => {
    for (const rule of rules) {
      const files = await listTypeScriptFiles(rule.root);
      for (const file of files) {
        const source = await Bun.file(file).text();
        for (const disallowed of rule.disallowed) {
          assert.notInclude(source, disallowed, `${file} must not import ${disallowed}`);
        }
      }
    }
  });
});
