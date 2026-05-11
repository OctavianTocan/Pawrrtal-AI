import '@testing-library/jest-dom/vitest';

// Mock browser APIs the composer relies on (MediaRecorder, matchMedia,
// ResizeObserver) so jsdom doesn't throw on import.

if (typeof window !== 'undefined') {
	if (!window.matchMedia) {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: (query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: () => undefined,
				removeListener: () => undefined,
				addEventListener: () => undefined,
				removeEventListener: () => undefined,
				dispatchEvent: () => false,
			}),
		});
	}

	if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
		(globalThis as { ResizeObserver: unknown }).ResizeObserver = class {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		};
	}
}
