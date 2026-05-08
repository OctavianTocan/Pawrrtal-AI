import { useEffect, useRef, useState } from 'react';
import { createConversation, devLogin, streamChat, uuidv4 } from './api';

type Message = { role: 'user' | 'assistant'; text: string };

export function App(): React.JSX.Element {
	const [ready, setReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [streaming, setStreaming] = useState(false);
	const conversationIdRef = useRef<string>(uuidv4());

	useEffect(() => {
		(async () => {
			try {
				await devLogin();
				await createConversation(conversationIdRef.current);
				setReady(true);
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		})();
	}, []);

	async function send(): Promise<void> {
		const question = draft.trim();
		if (!question || streaming) return;
		setDraft('');
		setMessages((m) => [...m, { role: 'user', text: question }, { role: 'assistant', text: '' }]);
		setStreaming(true);
		try {
			for await (const chunk of streamChat({ conversationId: conversationIdRef.current, question })) {
				setMessages((m) => {
					const next = [...m];
					const last = next[next.length - 1];
					if (last && last.role === 'assistant') {
						next[next.length - 1] = { ...last, text: last.text + chunk };
					}
					return next;
				});
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setStreaming(false);
		}
	}

	if (error !== null) {
		return (
			<main>
				<h1>Spike 01 — React + Vite</h1>
				<pre className="error">{error}</pre>
			</main>
		);
	}

	if (!ready) return <main>Connecting…</main>;

	return (
		<main>
			<h1>Spike 01 — React + Vite</h1>
			<ol className="messages">
				{messages.map((m, i) => (
					<li key={i} className={`msg msg-${m.role}`}>
						<strong>{m.role}:</strong> {m.text || (streaming && i === messages.length - 1 ? '…' : '')}
					</li>
				))}
			</ol>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					void send();
				}}
			>
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Say something to the agent…"
					rows={3}
					disabled={streaming}
				/>
				<button type="submit" disabled={streaming || draft.trim() === ''}>
					{streaming ? 'Streaming…' : 'Send'}
				</button>
			</form>
		</main>
	);
}
