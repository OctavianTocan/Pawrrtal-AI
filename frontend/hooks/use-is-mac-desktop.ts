'use client';

import { useEffect, useState } from 'react';
import { getDesktopPlatformSync } from '@/lib/desktop';

/**
 * Track whether the renderer is running inside the macOS desktop shell
 * so layouts can apply shell-specific chrome. Starts `false` so SSR and
 * the first client render agree (avoids hydration mismatch).
 *
 * Note: with the zero-native shell, `getDesktopPlatformSync()` always
 * returns null — zero-native uses the system title bar, so the custom
 * macOS traffic-light spacing that Electron required is no longer needed.
 * This hook will return false until a synchronous platform API lands in
 * zero-native.
 *
 * @returns `true` only when the desktop platform reports 'darwin'.
 */
export function useIsMacDesktop(): boolean {
	const [isMacDesktop, setIsMacDesktop] = useState(false);
	useEffect(() => {
		setIsMacDesktop(getDesktopPlatformSync() === 'darwin');
	}, []);
	return isMacDesktop;
}
