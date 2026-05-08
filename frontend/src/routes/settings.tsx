/**
 * Settings page route (`/settings`).
 *
 * Mounted outside the `_app` segment so the chat sidebar chrome does
 * not render around the settings panel.
 */

import { createFileRoute } from '@tanstack/react-router';
import { SettingsLayout } from '@/features/settings/SettingsLayout';

export const Route = createFileRoute('/settings')({
	component: () => <SettingsLayout />,
});
