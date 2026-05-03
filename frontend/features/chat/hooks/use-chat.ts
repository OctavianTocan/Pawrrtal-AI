import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import type { ChatModelId } from '../components/ModelSelectorPopover';

/** Sentinel returned by {@link parseSseMessage} when the stream signals completion. */
const STREAM_DONE = Symbol('STREAM_DONE');

/**
 * Parses a single SSE message and returns the delta content, a done
 * sentinel, or `null` for non-data / unparseable frames.
 */
function parseSseMessage(raw: string): string | typeof STREAM_DONE | null {
  if (!raw.startsWith('data: ')) return null;

  const data = raw.slice(6);

  if (data.includes('[DONE]')) return STREAM_DONE;

  try {
    const json = JSON.parse(data);
    // Only surface delta content to the caller; gracefully ignore
    // thinking, tool_use, tool_result, and error event types for now.
    return json.type === 'delta' ? (json.content as string) : null;
  } catch {
    // Ignore parse errors from incomplete SSE frames.
    return null;
  }
}

/**
 * Hook that exposes a streaming chat API via an async generator.
 *
 * @returns An object with `streamMessage` — call it to send a user
 *   message and yield assistant response chunks as they arrive.
 */
export function useChat(): {
  streamMessage: (
    message: string,
    conversationId: string,
    modelId: ChatModelId
  ) => AsyncGenerator<string>;
} {
  const fetcher = useAuthedFetch();

  async function* streamMessage(
    message: string,
    conversationId: string,
    modelId: ChatModelId
  ): AsyncGenerator<string> {
    const response = await fetcher('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        question: message,
        conversation_id: conversationId,
        model_id: modelId,
      }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
    });

    if (!response.body) throw new Error('Failed to get response body from chat API');

    // Pipe raw bytes through a text decoder so we can read string chunks.
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

    // SSE frames can arrive split across chunks — buffer partial frames here.
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;

      // SSE events are delimited by double newlines.
      const frames = buffer.split('\n\n');

      // The last element is either empty or a partial frame — keep it buffered.
      buffer = frames.pop() || '';

      for (const frame of frames) {
        const parsed = parseSseMessage(frame);

        if (parsed === STREAM_DONE) {
          yield buffer;
          return;
        }

        if (parsed !== null) {
          yield parsed;
        }
      }
    }
  }

  return { streamMessage };
}
