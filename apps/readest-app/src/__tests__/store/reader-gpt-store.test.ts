import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readerGPTRepository } from '@/services/reader-gpt/repository';
import type {
  ReaderGPTConversation,
  ReaderGPTMessage,
  ReaderGPTSelection,
} from '@/services/reader-gpt/types';
import { useReaderGPTStore } from '@/store/readerGPTStore';

const makeSelection = (label: string, createdAt: number): ReaderGPTSelection => ({
  id: `selection-${label}`,
  bookHash: 'book-1',
  bookTitle: 'The Book',
  bookAuthor: 'The Author',
  quote: `Passage ${label}`,
  locator: `epubcfi(/6/${createdAt})`,
  createdAt,
});

beforeEach(() => {
  useReaderGPTStore.setState({
    currentBookHash: null,
    currentSelection: null,
    activeConversation: null,
    conversations: [],
    messages: [],
    insights: [],
    focusedMessageId: null,
    isLoading: false,
  });
  vi.restoreAllMocks();
});

describe('readerGPTStore passage context', () => {
  it('keeps one conversation and hydrates the active context and turn associations for A, B, C', async () => {
    let persistedConversation: ReaderGPTConversation | null = null;
    const persistedMessages: ReaderGPTMessage[] = [];
    vi.spyOn(readerGPTRepository, 'saveConversation').mockImplementation(async (conversation) => {
      persistedConversation = structuredClone(conversation);
    });
    vi.spyOn(readerGPTRepository, 'saveMessage').mockImplementation(async (message) => {
      persistedMessages.push(structuredClone(message));
    });
    vi.spyOn(readerGPTRepository, 'getConversations').mockImplementation(async () =>
      persistedConversation ? [structuredClone(persistedConversation)] : [],
    );
    vi.spyOn(readerGPTRepository, 'getMessages').mockImplementation(async () =>
      structuredClone(persistedMessages),
    );
    vi.spyOn(readerGPTRepository, 'getInsights').mockResolvedValue([]);

    const conversationIds: string[] = [];
    for (const [index, label] of ['A', 'B', 'C'].entries()) {
      const selection = makeSelection(label, index + 1);
      const conversation = await useReaderGPTStore.getState().addSelection(selection);
      conversationIds.push(conversation.id);
      await useReaderGPTStore
        .getState()
        .addMessage('user', `Question ${label}`, conversation.activeContextId);
      await useReaderGPTStore.getState().addMessage('assistant', `Answer ${label}`);
    }

    expect(new Set(conversationIds).size).toBe(1);
    expect(useReaderGPTStore.getState().activeConversation?.activeContextId).toBe('selection-C');
    expect(
      useReaderGPTStore
        .getState()
        .messages.filter((message) => message.role === 'user')
        .map((message) => [message.content, message.contextId]),
    ).toEqual([
      ['Question A', 'selection-A'],
      ['Question B', 'selection-B'],
      ['Question C', 'selection-C'],
    ]);

    useReaderGPTStore.setState({
      currentBookHash: null,
      activeConversation: null,
      conversations: [],
      messages: [],
    });
    await useReaderGPTStore.getState().loadBook('book-1');

    expect(useReaderGPTStore.getState().activeConversation?.activeContextId).toBe('selection-C');
    expect(
      useReaderGPTStore
        .getState()
        .messages.filter((message) => message.role === 'user')
        .map((message) => message.contextId),
    ).toEqual(['selection-A', 'selection-B', 'selection-C']);
  });
});
