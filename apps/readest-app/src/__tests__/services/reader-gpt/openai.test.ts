import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock('@/services/ai/utils/httpFetch', () => ({ getAIFetch: () => mocks.fetch }));
vi.mock('@/services/translators/providers/openaiConfig', () => ({
  getOpenAITranslationAPIKey: vi.fn(async () => 'test-key'),
}));

import { parseOpenAIResponseEvent, streamReaderGPTResponse } from '@/services/reader-gpt/openai';

beforeEach(() => mocks.fetch.mockReset());

describe('parseOpenAIResponseEvent', () => {
  it('returns streamed output text deltas', () => {
    expect(
      parseOpenAIResponseEvent(
        'data: {"type":"response.output_text.delta","delta":"A useful answer"}',
      ),
    ).toEqual({ type: 'delta', text: 'A useful answer' });
  });

  it('recognizes the terminal event and ignores comments', () => {
    expect(parseOpenAIResponseEvent('data: [DONE]')).toEqual({ type: 'done' });
    expect(parseOpenAIResponseEvent(': keep-alive')).toBeNull();
  });

  it('surfaces API stream errors', () => {
    expect(
      parseOpenAIResponseEvent(
        'data: {"type":"error","error":{"message":"The model is unavailable"}}',
      ),
    ).toEqual({ type: 'error', message: 'The model is unavailable' });
  });

  it('uses the selected reader model for the next request', async () => {
    mocks.fetch.mockResolvedValue(
      new Response('data: {"type":"response.output_text.delta","delta":"Answer"}\n\n'),
    );

    await streamReaderGPTResponse({
      conversation: {
        id: 'conversation-1',
        hash: 'book-1',
        title: 'The Book',
        author: 'The Author',
        contexts: [],
        createdAt: 1,
        updatedAt: 1,
      },
      messages: [],
      model: 'gpt-5.6-sol',
      onDelta: vi.fn(),
    });

    const request = mocks.fetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({ model: 'gpt-5.6-sol' });
  });
});
