<script lang="ts">
	// Spike chat surface implemented with Svelte 5 runes.  Same four-step
	// flow as the React spikes; mostly here to feel out signal-style
	// reactivity vs React's useState dance.
	import { onMount } from 'svelte';
	import { createConversation, devLogin, streamChat, uuidv4 } from '$lib/api';

	type Message = { role: 'user' | 'assistant'; text: string };

	let ready = $state(false);
	let error = $state<string | null>(null);
	let draft = $state('');
	let messages = $state<Message[]>([]);
	let streaming = $state(false);
	const conversationId = uuidv4();

	onMount(async () => {
		try {
			await devLogin();
			await createConversation(conversationId);
			ready = true;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	});

	async function send() {
		const question = draft.trim();
		if (!question || streaming) return;
		draft = '';
		messages = [...messages, { role: 'user', text: question }, { role: 'assistant', text: '' }];
		streaming = true;
		try {
			for await (const chunk of streamChat({ conversationId, question })) {
				const last = messages[messages.length - 1];
				if (last && last.role === 'assistant') {
					messages[messages.length - 1] = { ...last, text: last.text + chunk };
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			streaming = false;
		}
	}
</script>

<main>
	<h1>Spike 03 — SvelteKit</h1>
	{#if error}
		<pre class="error">{error}</pre>
	{:else if !ready}
		<p>Connecting…</p>
	{:else}
		<ol class="messages">
			{#each messages as m, i (i)}
				<li class="msg msg-{m.role}">
					<strong>{m.role}:</strong>
					{m.text || (streaming && i === messages.length - 1 ? '…' : '')}
				</li>
			{/each}
		</ol>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				void send();
			}}
		>
			<textarea
				bind:value={draft}
				placeholder="Say something to the agent…"
				rows={3}
				disabled={streaming}
			></textarea>
			<button type="submit" disabled={streaming || draft.trim() === ''}>
				{streaming ? 'Streaming…' : 'Send'}
			</button>
		</form>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		line-height: 1.5;
		color-scheme: light dark;
	}
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	.messages {
		list-style: decimal-leading-zero;
		padding-left: 2rem;
		margin: 1.5rem 0;
	}
	.msg {
		margin: 0.5rem 0;
	}
	.msg-user strong {
		color: #2563eb;
	}
	.msg-assistant strong {
		color: #16a34a;
	}
	form {
		display: flex;
		gap: 0.5rem;
		flex-direction: column;
	}
	textarea {
		font: inherit;
		padding: 0.6rem;
		border-radius: 6px;
		border: 1px solid #ccc;
		resize: vertical;
	}
	button {
		align-self: flex-end;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		border: 0;
		background: #2563eb;
		color: white;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.error {
		color: #dc2626;
		white-space: pre-wrap;
	}
</style>
