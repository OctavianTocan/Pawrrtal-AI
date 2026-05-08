/**
 * Whimsy customization — public barrel.
 *
 * Re-exports the public surface of the whimsy feature so callers can
 * import from `@/features/whimsy` without reaching into the internal
 * file layout.  Consumers today:
 *
 *   - {@link useWhimsyTile}     — `frontend/features/chat/ChatView.tsx`,
 *                                 `frontend/features/settings/SettingsLayout.tsx`
 *   - {@link WhimsySettingsCard} — `frontend/features/settings/sections/AppearanceSection.tsx`
 *
 * Designed to be removable with minimal blast radius. To rip out:
 *
 * 1. Delete `frontend/features/whimsy/`.
 * 2. Revert the `useWhimsyTile()` calls in the three files above (or
 *    remove the texture overlay entirely).
 * 3. Optionally delete `frontend/lib/whimsy-tile.ts` and
 *    `frontend/app/dev/whimsy-tile/`.
 *
 * No new providers, no new contexts, no new query layers.  Storage
 * uses one localStorage key (`whimsy:config`) and re-uses the
 * existing settings primitives.
 */

export type { WhimsyColor, WhimsyConfig, WhimsyMode } from './config';
export { useWhimsyConfig } from './config';
export type { UseWhimsyTileResult } from './use-whimsy-tile';
export { useWhimsyTile } from './use-whimsy-tile';
export { WhimsySettingsCard } from './WhimsySettingsCard';
