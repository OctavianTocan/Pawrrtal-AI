'use client';

import { useEffect, useState } from 'react';
import { getDesktopPlatformSync } from '@/lib/desktop';

/**
 * Track whether the renderer is running inside the macOS Electron shell
 * so layouts can reserve space for the system traffic-light buttons that
 * `titleBarStyle: 'hiddenInset'` parks inside the BrowserWindow content
 * area (~80px wide × 28px tall in the top-left).
 *
 * Starts `false` so the SSR pass and the first client render agree
 * (avoids a hydration mismatch); flips on mount once `window.aiNexus`
 * is readable. The bridge surface is set once at preload time and never
 * changes, so a one-shot effect is sufficient — no listener needed.
 *
 * @returns `true` only when the Electron preload bridge reports
 * `process.platform === 'darwin'`.
 */
export function useIsMacDesktop(): boolean {
	const [isMacDesktop, setIsMacDesktop] = useState(false);
	useEffect(() => {
		setIsMacDesktop(getDesktopPlatformSync() === 'darwin');
	}, []);
	return isMacDesktop;
}
