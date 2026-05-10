#!/usr/bin/env node

import { existsSync, mkdirSync, chmodSync, createWriteStream, unlinkSync, writeFileSync, symlinkSync, lstatSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';
import { get } from 'https';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const binDir = join(projectRoot, 'bin');

function isMusl() {
  if (platform() !== 'linux') return false;
  try {
    const result = execSync('ldd --version 2>&1 || true', { encoding: 'utf8' });
    return result.toLowerCase().includes('musl');
  } catch {
    return existsSync('/lib/ld-musl-x86_64.so.1') || existsSync('/lib/ld-musl-aarch64.so.1');
  }
}

const osKey = platform() === 'linux' && isMusl() ? 'linux-musl' : platform();
const platformKey = `${osKey}-${arch()}`;
const ext = platform() === 'win32' ? '.exe' : '';
const binaryName = `zero-native-${platformKey}${ext}`;
const binaryPath = join(binDir, binaryName);

const packageJson = JSON.parse(
  readFileSync(join(projectRoot, 'package.json'), 'utf8')
);
const version = packageJson.version;

const GITHUB_REPO = 'vercel-labs/zero-native';
const DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/v${version}/${binaryName}`;
const CHECKSUMS_URL = `https://github.com/${GITHUB_REPO}/releases/download/v${version}/CHECKSUMS.txt`;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function createProgressReporter() {
  let lastBucket = -1;
  let lastMegabytes = -1;

  return ({ downloaded, total, done = false }) => {
    if (total > 0) {
      const percent = Math.min(100, Math.floor((downloaded / total) * 100));
      const bucket = done ? 100 : Math.floor(percent / 10) * 10;
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        console.log(`  ${bucket}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
      }
      return;
    }

    const megabytes = Math.floor(downloaded / 1024 / 1024);
    if (done || megabytes > lastMegabytes) {
      lastMegabytes = megabytes;
      console.log(`  downloaded ${formatBytes(downloaded)}`);
    }
  };
}

async function downloadFile(url, dest, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);

    function cleanup(err) {
      file.close();
      try { unlinkSync(dest); } catch {}
      reject(err);
    }

    const request = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        cleanup(new Error('Too many redirects'));
        return;
      }
      get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location;
          if (!location) {
            response.resume();
            cleanup(new Error('Redirect with no Location header'));
            return;
          }
          const resolved = new URL(location, url).href;
          response.resume();
          request(resolved, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          cleanup(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        const total = Number.parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          onProgress({ downloaded, total });
        });
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          onProgress({ downloaded, total, done: true });
          resolve();
        });
      }).on('error', cleanup);
    };

    request(url);
  });
}

async function downloadText(url) {
  return new Promise((resolve, reject) => {
    const request = (url, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const location = response.headers.location;
          if (!location) {
            response.resume();
            reject(new Error('Redirect with no Location header'));
            return;
          }
          response.resume();
          request(new URL(location, url).href, redirectCount + 1);
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => resolve(data));
      }).on('error', reject);
    };
    request(url);
  });
}

async function verifyChecksum(filePath, fileName) {
  try {
    const checksums = await downloadText(CHECKSUMS_URL);
    const line = checksums.split('\n').find((l) => l.trim().endsWith(fileName));
    if (!line) {
      console.log('✗ No checksum entry found for this binary.');
      return false;
    }
    const expectedHash = line.split(/\s+/)[0];
    const fileBuffer = readFileSync(filePath);
    const actualHash = createHash('sha256').update(fileBuffer).digest('hex');
    if (actualHash !== expectedHash) {
      console.log(`✗ Checksum mismatch!`);
      console.log(`  Expected: ${expectedHash}`);
      console.log(`  Actual:   ${actualHash}`);
      return false;
    }
    console.log('✓ Checksum verified');
    return true;
  } catch (err) {
    console.log(`✗ Could not verify checksum: ${err.message}`);
    return false;
  }
}

async function main() {
  if (existsSync(binaryPath)) {
    if (platform() !== 'win32') {
      chmodSync(binaryPath, 0o755);
    }
    console.log(`✓ Native binary ready: ${binaryName}`);
    await fixGlobalInstallBin();
    return;
  }

  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  console.log(`Downloading native binary for ${platformKey}...`);
  console.log(`URL: ${DOWNLOAD_URL}`);

  try {
    await downloadFile(DOWNLOAD_URL, binaryPath, createProgressReporter());

    console.log('Verifying checksum...');
    const checksumValid = await verifyChecksum(binaryPath, binaryName);
    if (!checksumValid) {
      unlinkSync(binaryPath);
      throw new Error('Checksum mismatch for downloaded native binary');
    }

    if (platform() !== 'win32') {
      chmodSync(binaryPath, 0o755);
    }

    console.log(`✓ Downloaded native binary: ${binaryName}`);
  } catch (err) {
    console.log(`Could not download native binary: ${err.message}`);
    console.log('');
    console.log('To build the native binary locally:');
    console.log('  1. Install Zig 0.16+: https://ziglang.org/download/');
    console.log('  2. Run: npm run build:native');
  }

  await fixGlobalInstallBin();
}

async function fixGlobalInstallBin() {
  if (platform() === 'win32') {
    await fixWindowsShims();
  } else {
    await fixUnixSymlink();
  }
}

async function fixUnixSymlink() {
  if (!existsSync(binaryPath)) {
    return;
  }

  let npmBinDir;
  try {
    const prefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
    npmBinDir = join(prefix, 'bin');
  } catch {
    return;
  }

  const symlinkPath = join(npmBinDir, 'zero-native');

  try {
    const stat = lstatSync(symlinkPath);
    if (!stat.isSymbolicLink()) return;
  } catch {
    return;
  }

  try {
    unlinkSync(symlinkPath);
    symlinkSync(binaryPath, symlinkPath);
    console.log('✓ Optimized: symlink points to native binary (zero overhead)');
  } catch (err) {
    console.log(`⚠ Could not optimize symlink: ${err.message}`);
    console.log('  CLI will work via Node.js wrapper (slightly slower startup)');
  }
}

async function fixWindowsShims() {
  if (!existsSync(binaryPath)) {
    return;
  }

  let npmBinDir;
  try {
    npmBinDir = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
  } catch {
    return;
  }

  const cmdShim = join(npmBinDir, 'zero-native.cmd');
  const ps1Shim = join(npmBinDir, 'zero-native.ps1');

  if (!existsSync(cmdShim)) return;

  const cpuArch = arch() === 'arm64' ? 'arm64' : 'x64';
  const relativeBinaryPath = `node_modules\\zero-native\\bin\\zero-native-win32-${cpuArch}.exe`;
  const absoluteBinaryPath = join(npmBinDir, relativeBinaryPath);

  if (!existsSync(absoluteBinaryPath)) return;

  try {
    const cmdContent = `@ECHO off\r\n"%~dp0${relativeBinaryPath}" %*\r\n`;
    writeFileSync(cmdShim, cmdContent);

    const ps1Content = `#!/usr/bin/env pwsh\r\n$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent\r\n& "$basedir\\${relativeBinaryPath}" $args\r\nexit $LASTEXITCODE\r\n`;
    writeFileSync(ps1Shim, ps1Content);

    console.log('✓ Optimized: shims point to native binary (zero overhead)');
  } catch (err) {
    console.log(`⚠ Could not optimize shims: ${err.message}`);
    console.log('  CLI will work via Node.js wrapper (slightly slower startup)');
  }
}

main().catch(console.error);
