/**
 * Dev orchestrator: runs the Vite frontend and FastAPI backend side-by-side
 * on plain localhost. Frontend on :3001, backend on :8000. No proxies, no HTTPS,
 * no special routing — just the two processes.
 */
import { $ } from 'bun';

// Free up dev ports before starting (handles ghost processes from previous runs).
// `.nothrow()` keeps the script running even if no process is bound to the port.
await $`lsof -ti:3001 | xargs kill -9`.quiet().nothrow();
await $`lsof -ti:8000 | xargs kill -9`.quiet().nothrow();

console.log(
	'Starting dev servers — frontend on http://localhost:3001, backend on http://localhost:8000'
);

// Frontend: Vite dev server.  Workspace package, run via bun --filter.
const frontendPromise = $`bun --filter app.nexus-ai dev`.quiet(false);

// Backend: explicit ASGI target via uvicorn. `main.app` is wrapped in CORS
// middleware, so FastAPI CLI discovery cannot treat it as a raw FastAPI instance.
const backendPromise =
	$`uv run --project backend uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload --reload-dir backend`.quiet(
		false
	);

await Promise.all([frontendPromise, backendPromise]);
