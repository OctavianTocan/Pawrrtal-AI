import { For, Show, createSignal, onMount } from 'solid-js';
import { createConversation, devLogin, streamChat, uuidv4 } from './api';

type Message = { role: 'user' | 'assistant'; text: string };

export function App() {
	const [ready, setReady] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [draft, setDraft] = createSignal('');
	const [messages, setMessages] = createSignal<Message[]>([]);
	const [streaming, setStreaming] = createSignal(false);
	const conversationId = uuidv4();

	onMount(async () => {
		try {
			await devLogin();
			await createConversation(conversationId);
			setReady(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	});

	async function send(): Promise<void> {
		const question = draft().trim();
		if (!question || streaming()) return;
		setDraft('');
		setMessages([
			...messages(),
			{ role: 'user', text: question },
			{ role: 'assistant', text: '' },
		]);
		setStreaming(true);
		try {
			for await (const chunk of streamChat({ conversationId, question })) {
				const cur = messages();
				const last = cur[cur.length - 1];
				if (last && last.role === 'assistant') {
					setMessages([...cur.slice(0, -1), { ...last, text: last.text + chunk }]);
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setStreaming(false);
		}
	}

	return (
		<main>
			<h1>Spike 04 — Solid.js</h1>
			<Show when={error() !== null} fallback={
				<Show when={ready()} fallback={<p>Connecting…</p>}>
					<ol class="messages">
						<For each={messages()}>
							{(m, i) => (
								<li class={`msg msg-${m.role}`}>
									<strong>{m.role}:</strong>{' '}
									{m.text || (streaming() && i() === messages().length - 1 ? '…' : '')}
								</li>
							)}
						</For>
					</ol>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void send();
						}}
					>
						<textarea
							value={draft()}
							onInput={(e) => setDraft(e.currentTarget.value)}
							placeholder="Say something to the agent…"
							rows={3}
							disabled={streaming()}
						/>
						<button type="submit" disabled={streaming() || draft().trim() === ''}>
							{streaming() ? 'Streaming…' : 'Send'}
						</button>
					</form>
				</Show>
			}>
				<pre class="error">{error()}</pre>
			</Show>
		</main>
	);
}
