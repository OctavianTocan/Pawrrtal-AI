import { useAuthedFetch } from "@/hooks/use-authed-fetch";

/*
    Custom hook to interact with the chat API.
*/
export function useChat() {
	const fetcher = useAuthedFetch();

	async function* streamMessage(
		message: string,
		conversationId: string,
	): AsyncGenerator<string> {
		// Send the message to the chat API, and get the response.
		const response = await fetcher("/api/chat", {
			method: "POST",
			body: JSON.stringify({
				question: message,
				conversation_id: conversationId,
			}),
			headers: {
				"Content-Type": "application/json",
				Accept: "text/event-stream",
			},
		});

		// Handle errors.
		if (!response.body) throw new Error("Failed to get body");

		// Transform the stream.
		// .pipeThrough() takes the raw bytes and runs them through the decoder.
		// .getReader() gives us a way to read the resulting text.
		const reader = response.body
			.pipeThrough(new TextDecoderStream())
			.getReader();

		// Buffer to store the streamed text.
		let buffer = "";

		// While the stream is not done, read the next chunk.
		while (true) {
			// Read the next chunk.
			const { done, value } = await reader.read();

			// If the stream is done, break the loop.
			if (done) break;

			// Add the new text to our buffer.
			buffer += value;

			// Split buffer by newlines to find individual messages. (SSE events are delimited by newlines).
			const messages = buffer.split("\n\n");

			// Save the last piece. The last item in the array is usually incomplete, so we save it to the buffer. We pop it off and add it back to the buffer.
			buffer = messages.pop() || "";

			// Process each message.
			for (const message of messages) {
				// Check for the SSE delimiter.
				if (message.startsWith("data: ")) {
					// Remove the 'data: ' prefix.
					const data = message.slice(6);

					// Handle the stream end event.
					if (data.includes("[DONE]")) {
						yield buffer;
						// Need this or we get an error when parsing the JSON below.
						break;
					}

					try {
						// Parse the message as JSON.
						const json = JSON.parse(data);

						// Yield the delta content.
						yield json.type === "delta" ? json.content : null;
					} catch (_error) {
						// Ignore errors for incomplete messages.
					}
				}
			}
		}
	}
	return { streamMessage };
}
