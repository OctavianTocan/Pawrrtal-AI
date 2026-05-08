/**
 * Root conversation page (`/`).
 *
 * Generates a fresh UUID on each mount so the {@link ChatContainer}
 * starts with a blank slate.  The `key` prop on the container ensures
 * React fully remounts when navigating back here from an existing
 * conversation.
 *
 * The onboarding modal is mounted once at the app-layout level and
 * only opens in response to `OPEN_ONBOARDING_EVENT`.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import ChatContainer from '@/features/chat/ChatContainer';

export const Route = createFileRoute('/_app/')({
	component: HomeRoute,
});

function HomeRoute(): React.JSX.Element {
	// Was `crypto.randomUUID()` inline in the server component; in a
	// client-side route we memoize per-mount so React StrictMode's
	// double-mount in dev doesn't change the id mid-render.
	const uuid = useMemo(() => crypto.randomUUID(), []);
	return <ChatContainer key={uuid} conversationId={uuid} />;
}
