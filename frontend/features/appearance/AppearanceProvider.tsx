'use client';

/**
 * AppearanceProvider — runtime token injection for per-user theme overrides.
 *
 * Reads the persisted `AppearanceSettings` via TanStack Query, merges
 * with the Mistral-inspired defaults, and writes the resolved values
 * onto `<html>` as CSS custom properties. Works for both light and
 * dark modes: only the active mode's color overrides are written so
 * `:root` (light) and `.dark` (dark) cascade-rules in `globals.css`
 * still take precedence over un-overridden slots.
 *
 * Wraps the entire app in `app/providers.tsx` so every surface picks
 * up the resolved tokens — sidebar, chat, modals, popovers all read
 * from the same `--background` / `--foreground` / `--accent` slots.
 */

import { createContext, useContext, useEffect, useMemo } from 'react';
import { DEFAULT_APPEARANCE } from './defaults';
import { resolveAppearance } from './merge';
import { useAppearance } from './queries';
import type { ResolvedAppearance, ThemeMode } from './types';

/**
 * Public context shape — consumers read the resolved appearance and
 * (optionally) the loading flag if they want to delay rendering until
 * the API responds. Most consumers should NOT delay; the defaults
 * already paint a sensible theme.
 */
interface AppearanceContextValue {
	resolved: ResolvedAppearance;
	isLoading: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue>({
	resolved: DEFAULT_APPEARANCE,
	isLoading: false,
});

/**
 * Read the resolved appearance + loading flag from the provider.
 * Throws nothing — if the provider isn't mounted, returns the
 * Mistral defaults so feature code can rely on always getting a
 * non-null value.
 */
export function useResolvedAppearance(): AppearanceContextValue {
	return useContext(AppearanceContext);
}

/**
 * Determine which palette key (light/dark) to apply given the user's
 * theme_mode preference + the OS-level `prefers-color-scheme`. Treated
 * as a pure function so it can be unit-tested without mounting React.
 */
export function pickActiveMode(preferred: ThemeMode, systemPrefersDark: boolean): 'light' | 'dark' {
	if (preferred === 'dark') return 'dark';
	if (preferred === 'light') return 'light';
	return systemPrefersDark ? 'dark' : 'light';
}

interface AppearanceProviderProps {
	children: React.ReactNode;
}

/**
 * Provider component — mount once at the app root.
 *
 * Side-effects only on the active mode's slots: writing to `--background`
 * inside a `useEffect` overrides whatever `:root` or `.dark` set in
 * `globals.css`. The cleanup phase clears the inline value when the
 * resolved settings change, so toggling between modes / resetting to
 * defaults restores the cascade-driven base value.
 */
export function AppearanceProvider({ children }: AppearanceProviderProps): React.JSX.Element {
	const { data, isLoading } = useAppearance();
	const resolved = useMemo(() => resolveAppearance(data), [data]);

	// Track which CSS custom properties we've written so we can clear
	// the exact same set on cleanup. Using a stable list of slot keys
	// from the resolved object means we never leak a stale `--accent`
	// from a previous render.
	useEffect(() => {
		if (typeof document === 'undefined') return;

		const root = document.documentElement;
		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const activeMode = pickActiveMode(resolved.options.theme_mode, systemPrefersDark);
		const activeColors = activeMode === 'dark' ? resolved.dark : resolved.light;

		// Slots written this pass — captured in a const so the cleanup
		// closure clears the exact same set even if `resolved` mutates.
		const writtenProps: string[] = [];

		// Color slots (active mode only — the inactive mode's vars stay
		// cascade-driven so a `.dark` toggle from elsewhere keeps working).
		for (const [slot, value] of Object.entries(activeColors)) {
			const cssVar = `--${slot}`;
			root.style.setProperty(cssVar, value);
			writtenProps.push(cssVar);
		}

		// Font stacks — applied to both modes since fonts don't fork by mode.
		root.style.setProperty('--font-sans-stack', resolved.fonts.sans);
		root.style.setProperty('--font-display-stack', resolved.fonts.display);
		root.style.setProperty('--font-mono-stack', resolved.fonts.mono);
		writtenProps.push('--font-sans-stack', '--font-display-stack', '--font-mono-stack');

		// Base font size — drives `--font-size-base`, which `<html>`
		// reads in `globals.css` so every `rem` value scales with it.
		root.style.setProperty('--font-size-base', `${resolved.options.ui_font_size}px`);
		writtenProps.push('--font-size-base');

		// `theme_mode` toggles — explicit `.dark` class so Tailwind's
		// `dark:` variant picks up the active mode regardless of what
		// the boot script in `layout.tsx` decided.
		if (activeMode === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}

		// Pointer-cursors toggle: expose as a `data-*` attribute so
		// utility CSS (or future opt-out rules) can react without
		// mutating Tailwind classes per element.
		root.dataset.pointerCursors = resolved.options.pointer_cursors ? 'on' : 'off';

		return () => {
			for (const cssVar of writtenProps) {
				root.style.removeProperty(cssVar);
			}
			delete root.dataset.pointerCursors;
		};
	}, [resolved]);

	const contextValue = useMemo<AppearanceContextValue>(
		() => ({ resolved, isLoading }),
		[resolved, isLoading]
	);

	return <AppearanceContext.Provider value={contextValue}>{children}</AppearanceContext.Provider>;
}
