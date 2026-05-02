/**
 * Local dev orchestrator: Next.js (frontend) + FastAPI (backend), both behind Portless HTTPS.
 *
 * Why this file exists:
 * - Portless listens on 443 and sends traffic to your real servers on random/high ports.
 * - If two Portless processes fight over startup, or the browser opens too early, you get
 *   Portless's own "404 / No app registered" page even when Next says "Ready".
 * - So we: reset proxy once, start apps in a safe order, then poll until HTTPS works before opening the browser.
 *
 * See: https://github.com/vercel-labs/portless
 */
import { homedir } from 'node:os';
import { $ } from 'bun';
import open from 'open';

/** Public URL the proxy serves for the Next app (must match frontend Portless `--name`). */
const FRONTEND_URL = 'https://app.nexus-ai.localhost';

/**
 * Hit the frontend URL over HTTPS and guess whether Portless is forwarding to Next yet.
 *
 * We use `curl` (not `fetch`) so we can pass Portless's CA file (`~/.portless/ca.pem`) when it exists.
 * Without trusting that CA, HTTPS checks often fail on the first run or in scripts.
 *
 * Portless's "nothing registered" page contains the phrase `No app registered`. A real Next response
 * might be 200, a redirect (3xx), or even a Next 404 — but not that stub — so we treat those as OK.
 */
async function tryFrontendReachable(caPath: string): Promise<boolean> {
  // `-w '\\n%{http_code}'` appends the status line after the body so we can split them.
  const args = ['curl', '-sS', '--max-time', '3', '-w', '\n%{http_code}', FRONTEND_URL];
  if (await Bun.file(caPath).exists()) {
    args.splice(1, 0, '--cacert', caPath);
  } else {
    // First run or missing CA file: skip verify so we can still detect routing vs stub page.
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

/** Poll until the frontend responds through Portless, then open the system browser (unless disabled). */
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

// Portless: one HTTPS proxy on the machine should match the CLI version we run via `bunx`
// (see root package.json `devDependencies`). Stop first so we never attach apps to an old daemon.
await $`bunx portless proxy stop`.nothrow();
// Start proxy explicitly before any `portless run` children so two apps don't race auto-start.
await $`bunx portless proxy start`.nothrow();

// --Here, "--project backend" ensures we use the correct uv.lock file.--
// Frontend registers `app.nexus-ai.localhost` first; backend uses `api.app.nexus-ai` subdomain.
// Short pause reduces simultaneous Portless registration races when both spin up.
const frontendPromise = $`bun --cwd frontend dev`.quiet(false);

await Bun.sleep(1500);

const backendPromise =
  $`bunx portless api.app.nexus-ai --app-port 8000 --force uv run --project backend fastapi dev backend/main.py`.quiet(
    false
  );

// Runs in parallel with the long-running dev servers; does not block them from starting.
void waitThenOpenBrowser();

await Promise.all([frontendPromise, backendPromise]);
