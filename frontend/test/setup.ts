import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom doesn't ship a ResizeObserver — radix-ui's Slider, DropdownMenu,
// and a few other primitives crash without it. Stub the minimum surface
// so component tests render.
class ResizeObserverPolyfill {
	observe(): void {
		/* noop */
	}
	unobserve(): void {
		/* noop */
	}
	disconnect(): void {
		/* noop */
	}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
	(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
		ResizeObserverPolyfill;
}

// jsdom's `Element.scrollIntoView` is undefined; radix-ui's submenu
// keyboard navigation calls it. Stub as a no-op so menu interactions
// don't crash the test runner.
if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = (): void => {
		/* noop */
	};
}

// `window.matchMedia` isn't implemented in jsdom — `useIsMobile` and
// other responsive hooks call it during render. Provide a stub that
// always reports "not matching" plus the addEventListener noop.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
	(window as unknown as { matchMedia: (query: string) => MediaQueryList }).matchMedia = (
		query: string
	) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {
				/* legacy noop */
			},
			removeListener: () => {
				/* legacy noop */
			},
			addEventListener: () => {
				/* noop */
			},
			removeEventListener: () => {
				/* noop */
			},
			dispatchEvent: () => false,
		}) as MediaQueryList;
}

afterEach((): void => {
	cleanup();
});
