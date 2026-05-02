import { homedir } from 'node:os';
import { $ } from 'bun';
import open from 'open';

const FRONTEND_URL = 'https://app.nexus-ai.localhost';

/** Returns true once Portless is forwarding (no longer serving its own “no app registered” stub). */
async function tryFrontendReachable(caPath: string): Promise<boolean> {
  const args = ['curl', '-sS', '--max-time', '3', '-w', '\n%{http_code}', FRONTEND_URL];
  if (await Bun.file(caPath).exists()) {
    args.splice(1, 0, '--cacert', caPath);
  } else {
    args.splice(1, 0, '-k');
  }

  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
  const combined = await new Response(proc.stdout).text();
  await proc.exited;

  const lastNl = combined.lastIndexOf('\n');
  const body = lastNl >= 0 ? combined.slice(0, lastNl) : combined;
  const code = lastNl >= 0 ? combined.slice(lastNl + 1).trim() : '';

  if (!code) return false;
  if (code.startsWith('3')) return true;
  if (code === '200') return true;
  if (code === '404' && !body.includes('No app registered')) return true;
  return false;
}

async function waitThenOpenBrowser(): Promise<void> {
  const shouldAutoOpen = process.env.NO_AUTO_OPEN !== '1';
  if (!shouldAutoOpen) return;

  const caPath = `${homedir()}/.portless/ca.pem`;
  const deadline = Date.now() + 60_000;
  let ready = false;

  while (Date.now() < deadline) {
    try {
      if (await tryFrontendReachable(caPath)) {
        ready = true;
        break;
      }
    } catch {
      /* curl errors while servers boot */
    }
    await Bun.sleep(400);
  }

  if (!ready) {
    console.warn(
      `Timed out waiting for ${FRONTEND_URL} to route through Portless. Open it manually when Next shows Ready, or try: portless proxy stop && bun run dev`
    );
  }

  try {
    await open(FRONTEND_URL);
    console.log(`Browser opened at ${FRONTEND_URL}`);
  } catch (err) {
    console.error(`Failed to open browser: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// --Starting development servers--
console.log('Starting development servers...');

// This is a fix for potential issues where the ports are not released.
// Kill ghost processes on ports 3001 (Next.js) and 8000 (FastAPI)
// .nothrow() keeps the script running even if no process is found
await $`lsof -ti:3001 | xargs kill -9`.quiet().nothrow();
await $`lsof -ti:8000 | xargs kill -9`.quiet().nothrow();
// Remove the Next.js dev lock that causes the "Unable to acquire lock" error
await $`rm -rf frontend/.next/dev/lock`.quiet().nothrow();

// Reset proxy so the daemon matches this repo's portless version (`bunx` uses package.json).
// A stale global proxy (older CLI) can leave routes empty while app processes log as healthy.
await $`bunx portless proxy stop`.nothrow();
// Ensure a single proxy is listening before any registering children. Two simultaneous
// `portless run` auto-starts can race (Portless 404 “No apps running” while Next logs Ready).
await $`bunx portless proxy start`.nothrow();

// --Here, "--project backend" ensures we use the correct uv.lock file.--
// Start the frontend first so its route wins deterministically; backend follows shortly after.
const frontendPromise = $`bun --cwd frontend dev`.quiet(false);

await Bun.sleep(1500);

const backendPromise =
  $`bunx portless api.app.nexus-ai --app-port 8000 --force uv run --project backend fastapi dev backend/main.py`.quiet(
    false
  );

void waitThenOpenBrowser();

await Promise.all([frontendPromise, backendPromise]);
