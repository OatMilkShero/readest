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

  it('binds each reader question to its persisted passage context in the request history', async () => {
    mocks.fetch.mockImplementation(async () => new Response('data: [DONE]\n\n'));

    const conversationId = 'conversation-1';
    const selections = ['A', 'B', 'C'].map((label, index) => ({
      id: `selection-${label}`,
      bookHash: 'book-1',
      bookTitle: 'The Book',
      bookAuthor: 'The Author',
      quote: `Passage ${label}`,
      locator: `epubcfi(/6/${index + 2})`,
      createdAt: index + 1,
    }));
    const messages = [
      {
        id: 'question-A',
        conversationId,
        role: 'user' as const,
        content: 'Question A',
        contextId: selections[0]!.id,
        createdAt: 10,
      },
      {
        id: 'answer-A',
        conversationId,
        role: 'assistant' as const,
        content: 'Answer A',
        createdAt: 11,
      },
      {
        id: 'question-B',
        conversationId,
        role: 'user' as const,
        content: 'Question B',
        contextId: selections[1]!.id,
        createdAt: 12,
      },
      {
        id: 'answer-B',
        conversationId,
        role: 'assistant' as const,
        content: 'Answer B',
        createdAt: 13,
      },
      {
        id: 'question-C',
        conversationId,
        role: 'user' as const,
        content: 'Question C',
        contextId: selections[2]!.id,
        createdAt: 14,
      },
    ];
    const conversation = {
      id: conversationId,
      hash: 'book-1',
      title: 'The Book',
      author: 'The Author',
      contexts: selections,
      createdAt: 1,
      updatedAt: 14,
    };

    for (const [turnIndex, messageCount] of [1, 3, 5].entries()) {
      await streamReaderGPTResponse({
        conversation: {
          ...conversation,
          contexts: selections.slice(0, turnIndex + 1),
          activeContextId: selections[turnIndex]!.id,
        },
        messages: messages.slice(0, messageCount),
        model: 'gpt-5.6-sol',
        onDelta: vi.fn(),
      });
    }

    const requestInputs = mocks.fetch.mock.calls.map(([, init]) => {
      const body = JSON.parse((init as RequestInit).body as string) as {
        input: Array<{ role: string; content: string }>;
      };
      return body.input;
    });
    const userInputs = requestInputs.map((input) =>
      input.filter((item) => item.role === 'user').map((item) => item.content),
    );

    expect(userInputs).toEqual([
      [expect.stringMatching(/Active passage: Passage 1[\s\S]*Question A/)],
      [
        expect.stringMatching(/Active passage: Passage 1[\s\S]*Question A/),
        expect.stringMatching(/Active passage: Passage 2[\s\S]*Question B/),
      ],
      [
        expect.stringMatching(/Active passage: Passage 1[\s\S]*Question A/),
        expect.stringMatching(/Active passage: Passage 2[\s\S]*Question B/),
        expect.stringMatching(/Active passage: Passage 3[\s\S]*Question C/),
      ],
    ]);
    expect(requestInputs[2]!.map((item) => item.role)).toEqual([
      'developer',
      'user',
      'assistant',
      'user',
      'assistant',
      'user',
    ]);
    expect(requestInputs[0]![0]!.content).toContain('Passage A');
    expect(requestInputs[0]![0]!.content).not.toContain('Passage B');
    expect(requestInputs[1]![0]!.content).toContain('Passage A');
    expect(requestInputs[1]![0]!.content).toContain('Passage B');
    expect(requestInputs[1]![0]!.content).not.toContain('Passage C');
    expect(requestInputs[2]![0]!.content).toContain('Passage A');
    expect(requestInputs[2]![0]!.content).toContain('Passage B');
    expect(requestInputs[2]![0]!.content).toContain('Passage C');
    expect(new Set(messages.map((message) => message.conversationId))).toEqual(
      new Set([conversationId]),
    );
  });
});
