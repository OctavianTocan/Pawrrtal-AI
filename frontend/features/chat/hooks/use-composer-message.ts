import { type ChangeEvent, useCallback, useState } from 'react';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

/**
 * Owns the controlled state for the chat composer textarea.
 *
 * Extracted from {@link import('../ChatContainer').default} so the container
 * stays thin. All updaters are functional so callback identities are stable
 * across renders — important because they're passed deep into ChatComposer
 * and into memoised children.
 */
export function useComposerMessage(): {
	message: PromptInputMessage;
	setMessage: (message: PromptInputMessage) => void;
	onUpdateMessage: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	onReplaceMessageContent: (content: string) => void;
	onSelectSuggestion: (prompt: string) => void;
} {
	const [message, setMessage] = useState<PromptInputMessage>({ content: '', files: [] });

	const onUpdateMessage = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
		const next = event.currentTarget.value;
		setMessage((curr) => ({ ...curr, content: next }));
	}, []);

	const onReplaceMessageContent = useCallback((content: string) => {
		setMessage((curr) => ({ ...curr, content }));
	}, []);

	const onSelectSuggestion = useCallback((prompt: string) => {
		setMessage({ content: prompt, files: [] });
	}, []);

	return { message, setMessage, onUpdateMessage, onReplaceMessageContent, onSelectSuggestion };
}
