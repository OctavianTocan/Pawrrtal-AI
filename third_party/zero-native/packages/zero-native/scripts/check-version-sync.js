#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..', '..');

const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
const expectedVersion = packageJson.version;

const mainZigPath = join(repoRoot, 'tools', 'zero-native', 'main.zig');
const mainZig = readFileSync(mainZigPath, 'utf-8');

const versionMatch = mainZig.match(/^const version = "([^"]*)";/m);

if (!versionMatch) {
  console.error('Could not find `const version = "...";` in tools/zero-native/main.zig');
  process.exit(1);
}

const zigVersion = versionMatch[1];
let errors = 0;

if (zigVersion !== expectedVersion) {
  console.error(`Version mismatch: package.json=${expectedVersion}, tools/zero-native/main.zig=${zigVersion}`);
  errors++;
}

if (errors > 0) {
  console.error(`\nRun "npm run version:sync" in packages/zero-native to fix.`);
  process.exit(1);
}

console.log(`Versions in sync: ${expectedVersion}`);
