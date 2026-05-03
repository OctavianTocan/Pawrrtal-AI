import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './use-chat';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

function createStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller): void {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    {
      headers: {
        'content-type': 'text/event-stream',
      },
    }
  );
}

async function collectStream(stream: AsyncGenerator<string>): Promise<string[]> {
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return chunks;
}

describe('useChat', (): void => {
  beforeEach((): void => {
    replaceMock.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('posts to the versioned chat endpoint and yields delta chunks', async (): Promise<void> => {
    vi.mocked(fetch).mockResolvedValue(
      createStreamResponse([
        'data: {"type":"delta","content":"Hel"}\n\n',
        'data: {"type":"delta","content":"lo"}\n\n',
        'data: [DONE]\n\n',
      ])
    );

    const { result } = renderHook(() => useChat());

    await expect(
      collectStream(result.current.streamMessage('Hi', 'conversation-1', 'gpt-5.5'))
    ).resolves.toEqual(['Hel', 'lo', '']);

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        question: 'Hi',
        conversation_id: 'conversation-1',
        model_id: 'gpt-5.5',
      }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      credentials: 'include',
    });
  });

  it('buffers SSE frames split across network chunks', async (): Promise<void> => {
    vi.mocked(fetch).mockResolvedValue(
      createStreamResponse(['data: {"type":"delta","', 'content":"Split"}\n\n', 'data: [DONE]\n\n'])
    );

    const { result } = renderHook(() => useChat());

    await expect(
      collectStream(result.current.streamMessage('Hi', 'conversation-1', 'gpt-5.5'))
    ).resolves.toEqual(['Split', '']);
  });

  it('throws backend stream error events instead of thinking forever', async (): Promise<void> => {
    vi.mocked(fetch).mockResolvedValue(
      createStreamResponse([
        'data: {"type":"error","content":"Claude CLI failed: missing auth"}\n\n',
        'data: [DONE]\n\n',
      ])
    );

    const { result } = renderHook(() => useChat());

    await expect(
      collectStream(result.current.streamMessage('Hi', 'conversation-1', 'claude-sonnet-4-6'))
    ).rejects.toThrow('Claude CLI failed: missing auth');
  });
});
