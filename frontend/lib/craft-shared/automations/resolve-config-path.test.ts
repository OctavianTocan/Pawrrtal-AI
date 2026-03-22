import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';
import { resolveAutomationsConfigPath } from './resolve-config-path';
import { AUTOMATIONS_CONFIG_FILE } from './constants';

describe('resolve-config-path', () => {
  it('returns automations.json path for workspace root', () => {
    const root = '/tmp/test-workspace';
    expect(resolveAutomationsConfigPath(root)).toBe(join(root, AUTOMATIONS_CONFIG_FILE));
  });
});
