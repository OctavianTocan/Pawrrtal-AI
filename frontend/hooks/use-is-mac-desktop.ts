'use client';

import { useEffect, useState } from 'react';
import { getDesktopPlatformSync, getTrafficLightLeftInsetPxSync } from '@/lib/desktop';

export interface MacDesktopChromeState {
	isMacDesktop: boolean;
	trafficLightLeftInsetPx: number;
}

const INITIAL_CHROME: MacDesktopChromeState = {
	isMacDesktop: false,
	trafficLightLeftInsetPx: 0,
};

/**
 * Layout snapshot for the macOS Electron shell: platform detection plus horizontal
 * inset when overlay traffic lights draw inside web content (`hidden` /
 * `hiddenInset`). Starts empty so SSR and the first client paint stay aligned;
 * updates on mount once `window.aiNexus` is readable.
 */
export function useMacDesktopChrome(): MacDesktopChromeState {
	const [state, setState] = useState<MacDesktopChromeState>(INITIAL_CHROME);
	useEffect(() => {
		setState({
			isMacDesktop: getDesktopPlatformSync() === 'darwin',
			trafficLightLeftInsetPx: getTrafficLightLeftInsetPxSync(),
		});
	}, []);
	return state;
}

/**
 * Track whether the renderer is running inside the macOS Electron shell
 * so layouts can apply desktop-specific chrome (e.g. `-webkit-app-region`
 * drag on the in-app header). Starts `false` so SSR and the first client
 * render agree (avoids hydration mismatch); flips on mount once `window.aiNexus`
 * is readable.
 *
 * @returns `true` only when the Electron preload bridge reports
 * `process.platform === 'darwin'`.
 */
export function useIsMacDesktop(): boolean {
	const { isMacDesktop } = useMacDesktopChrome();
	return isMacDesktop;
}
