// Same contract as the other spikes.  Self-contained on purpose.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:8000';

export function uuidv4(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6]! & 0x0f) | 0x40;
	bytes[8] = (bytes[8]! & 0x3f) | 0x80;
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function devLogin(): Promise<void> {
	const res = await fetch(`${BACKEND_URL}/api/v1/auth/dev-login`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!res.ok && res.status !== 404) throw new Error(`dev-login failed: ${res.status}`);
}

export async function createConversation(id: string, title = 'Spike chat'): Promise<void> {
	const res = await fetch(`${BACKEND_URL}/api/v1/conversations/${id}`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title }),
	});
	if (!res.ok && res.status !== 409) throw new Error(`createConversation failed: ${res.status}`);
}

export async function* streamChat(args: {
	conversationId: string;
	question: string;
	modelId?: string;
}): AsyncGenerator<string, void, void> {
	const res = await fetch(`${BACKEND_URL}/api/v1/chat/`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			question: args.question,
			conversation_id: args.conversationId,
			model_id: args.modelId ?? 'gemini-3-flash-preview',
		}),
	});
	if (!res.ok || res.body === null) throw new Error(`chat failed: ${res.status}`);

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const frames = buffer.split('\n\n');
		buffer = frames.pop() ?? '';
		for (const frame of frames) {
			const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
			if (!dataLine) continue;
			const payload = dataLine.slice('data: '.length);
			if (payload === '[DONE]') return;
			try {
				const event = JSON.parse(payload) as { type: string; content?: string };
				if (event.type === 'delta' && event.content) yield event.content;
			} catch {
				/* malformed frame */
			}
		}
	}
}
