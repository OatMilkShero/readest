import { describe, expect, it } from 'vitest';

import {
  DEFAULT_READER_GPT_MODEL,
  getReaderGPTConversationLabel,
  READER_GPT_MODELS,
  resolveReaderGPTModel,
} from '@/services/reader-gpt/models';
import { DEFAULT_READSETTINGS } from '@/services/constants';
import type { ReaderGPTConversation } from '@/services/reader-gpt/types';

const conversation: ReaderGPTConversation = {
  id: 'conversation-1',
  hash: 'book-1',
  title: 'The Book',
  author: 'The Author',
  contexts: [],
  createdAt: 1,
  updatedAt: 1,
};

describe('reader GPT model preferences', () => {
  it('offers only Luna, Terra, and Sol with Terra as the fallback', () => {
    expect(READER_GPT_MODELS.map(({ value }) => value)).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
    ]);
    expect(DEFAULT_READER_GPT_MODEL).toBe('gpt-5.6-terra');
    expect(DEFAULT_READSETTINGS.readerGPTModel).toBe('gpt-5.6-terra');
    expect(resolveReaderGPTModel()).toBe('gpt-5.6-terra');
    expect(resolveReaderGPTModel('unsupported-model')).toBe('gpt-5.6-terra');
    expect(resolveReaderGPTModel('gpt-5.6-sol')).toBe('gpt-5.6-sol');
  });

  it('uses a saved title, then passage context, to distinguish conversation history', () => {
    expect(
      getReaderGPTConversationLabel({ ...conversation, conversationTitle: 'Why this metaphor?' }),
    ).toBe('Why this metaphor?');
    expect(
      getReaderGPTConversationLabel({
        ...conversation,
        contexts: [
          {
            id: 'context-1',
            bookHash: 'book-1',
            bookTitle: 'The Book',
            bookAuthor: 'The Author',
            quote: 'A sufficiently long selected passage that should become a readable preview.',
            createdAt: 1,
          },
        ],
      }),
    ).toBe('A sufficiently long selected passage that should…');
  });
});
