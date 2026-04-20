import { $ } from 'bun';
import open from 'open';

// --Starting development servers--
console.log('Starting development servers...');

// This is a fix for potential issues where the ports are not released.
// Kill ghost processes on ports 3001 (Next.js) and 8000 (FastAPI)
// .nothrow() keeps the script running even if no process is found
await $`lsof -ti:3001 | xargs kill -9`.quiet().nothrow();
await $`lsof -ti:8000 | xargs kill -9`.quiet().nothrow();
// Remove the Next.js dev lock that causes the "Unable to acquire lock" error
await $`rm -rf frontend/.next/dev/lock`.quiet().nothrow();

// --Here, "--project backend" ensures we use the correct uv.lock file.--
// Start both dev servers in the background (don't wait for them to complete).
// They run indefinitely, so we fire them off and let them output to stdout/stderr.
const frontendPromise = $`bun --cwd frontend dev`.quiet(false);
const backendPromise =
  $`portless api.app.nexus-ai --app-port 8000 --force uv run --project backend fastapi dev backend/main.py`.quiet(
    false
  );

// Auto-open browser after servers have had time to initialize
// Wait 2-3 seconds to ensure Next.js is fully ready before opening
setTimeout(() => {
  const frontendUrl = 'https://app.nexus-ai.localhost';
  const shouldAutoOpen = process.env.NO_AUTO_OPEN !== '1';

  if (shouldAutoOpen) {
    open(frontendUrl).catch((err) => {
      console.error(`Failed to open browser: ${err.message}`);
    });
    console.log(`🌐 Browser opened at ${frontendUrl}`);
  }
}, 2500);

// Let the servers run indefinitely
await Promise.all([frontendPromise, backendPromise]);
