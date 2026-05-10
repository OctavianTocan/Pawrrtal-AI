#!/usr/bin/env node

import { cpSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..', '..');

const sourceDir = join(repoRoot, 'src');
const targetDir = join(projectRoot, 'src');

rmSync(targetDir, { recursive: true, force: true });
cpSync(sourceDir, targetDir, { recursive: true });

console.log(`✓ Copied framework sources to ${targetDir}`);
