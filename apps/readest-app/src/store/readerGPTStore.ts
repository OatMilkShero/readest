import { create } from 'zustand';

import { makeReaderGPTId, readerGPTRepository } from '@/services/reader-gpt/repository';
import type {
  ReaderGPTBook,
  ReaderGPTConversation,
  ReaderGPTMessage,
  ReaderGPTSelection,
  SavedGPTInsight,
} from '@/services/reader-gpt/types';

interface ReaderGPTState {
  currentBookHash: string | null;
  currentSelection: ReaderGPTSelection | null;
  activeConversation: ReaderGPTConversation | null;
  conversations: ReaderGPTConversation[];
  messages: ReaderGPTMessage[];
  insights: SavedGPTInsight[];
  focusedMessageId: string | null;
  isLoading: boolean;
  setCurrentSelection: (selection: ReaderGPTSelection | null) => void;
  loadBook: (bookHash: string) => Promise<void>;
  newConversation: (book: ReaderGPTBook) => Promise<ReaderGPTConversation>;
  selectConversation: (conversationId: string) => Promise<void>;
  focusMessage: (messageId: string | null) => void;
  addSelection: (selection: ReaderGPTSelection) => Promise<ReaderGPTConversation>;
  addCurrentSelection: () => Promise<ReaderGPTConversation | null>;
  addMessage: (
    role: ReaderGPTMessage['role'],
    content: string,
    contextId?: string,
  ) => Promise<ReaderGPTMessage>;
  saveInsight: (assistantMessageId: string) => Promise<SavedGPTInsight | null>;
}

const createConversation = (book: ReaderGPTBook): ReaderGPTConversation => {
  const now = Date.now();
  return {
    ...book,
    id: makeReaderGPTId(),
    title: book.title,
    contexts: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const useReaderGPTStore = create<ReaderGPTState>((set, get) => ({
  currentBookHash: null,
  currentSelection: null,
  activeConversation: null,
  conversations: [],
  messages: [],
  insights: [],
  focusedMessageId: null,
  isLoading: false,

  setCurrentSelection: (currentSelection) => set({ currentSelection }),

  loadBook: async (bookHash) => {
    const isChangingBook = get().currentBookHash !== bookHash;
    set({ isLoading: true });
    const [conversations, insights] = await Promise.all([
      readerGPTRepository.getConversations(bookHash),
      readerGPTRepository.getInsights(bookHash),
    ]);
    const previous = get().activeConversation;
    const activeConversation =
      conversations.find((conversation) => conversation.id === previous?.id) ??
      conversations[0] ??
      null;
    const messages = activeConversation
      ? await readerGPTRepository.getMessages(activeConversation.id)
      : [];
    set({
      currentBookHash: bookHash,
      conversations,
      activeConversation,
      messages,
      insights,
      ...(isChangingBook ? { focusedMessageId: null } : {}),
      isLoading: false,
    });
  },

  newConversation: async (book) => {
    const conversation = createConversation(book);
    await readerGPTRepository.saveConversation(conversation);
    set((state) => ({
      currentBookHash: book.hash,
      activeConversation: conversation,
      conversations: [
        conversation,
        ...state.conversations.filter((item) => item.hash === book.hash),
      ],
      messages: [],
      focusedMessageId: null,
    }));
    return conversation;
  },

  selectConversation: async (conversationId) => {
    const conversation = get().conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    set({ isLoading: true });
    const messages = await readerGPTRepository.getMessages(conversationId);
    set({ activeConversation: conversation, messages, focusedMessageId: null, isLoading: false });
  },

  focusMessage: (focusedMessageId) => set({ focusedMessageId }),

  addSelection: async (selection) => {
    let conversation = get().activeConversation;
    const createdNew = !conversation || conversation.hash !== selection.bookHash;
    if (!conversation || conversation.hash !== selection.bookHash) {
      conversation = createConversation({
        hash: selection.bookHash,
        title: selection.bookTitle,
        author: selection.bookAuthor,
      });
    }
    const existing = conversation.contexts.find(
      (context) => context.locator === selection.locator && context.quote === selection.quote,
    );
    const updated: ReaderGPTConversation = {
      ...conversation,
      contexts: existing ? conversation.contexts : [...conversation.contexts, selection],
      activeContextId: existing?.id ?? selection.id,
      updatedAt: Date.now(),
    };
    await readerGPTRepository.saveConversation(updated);
    set((state) => ({
      currentBookHash: selection.bookHash,
      activeConversation: updated,
      conversations: [
        updated,
        ...state.conversations.filter(
          (item) => item.hash === selection.bookHash && item.id !== updated.id,
        ),
      ],
      ...(createdNew ? { messages: [] } : {}),
    }));
    return updated;
  },

  addCurrentSelection: async () => {
    const selection = get().currentSelection;
    if (!selection) return null;
    return get().addSelection(selection);
  },

  addMessage: async (role, content, contextId) => {
    const conversation = get().activeConversation;
    if (!conversation) throw new Error('Start a conversation before sending a message');
    const message: ReaderGPTMessage = {
      id: makeReaderGPTId(),
      conversationId: conversation.id,
      role,
      content,
      ...(contextId ? { contextId } : {}),
      createdAt: Date.now(),
    };
    await readerGPTRepository.saveMessage(message);
    const updatedConversation = {
      ...conversation,
      ...(role === 'user' && !conversation.conversationTitle
        ? { conversationTitle: content.replace(/\s+/g, ' ').trim() }
        : {}),
      updatedAt: Date.now(),
    };
    await readerGPTRepository.saveConversation(updatedConversation);
    set((state) => ({
      activeConversation: updatedConversation,
      conversations: [
        updatedConversation,
        ...state.conversations.filter((item) => item.id !== updatedConversation.id),
      ],
      messages: [...state.messages, message],
      focusedMessageId: null,
    }));
    return message;
  },

  saveInsight: async (assistantMessageId) => {
    const { activeConversation: conversation, messages } = get();
    if (!conversation) return null;
    const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
    const assistant = messages[assistantIndex];
    if (!assistant || assistant.role !== 'assistant') return null;
    const question = [...messages.slice(0, assistantIndex)]
      .reverse()
      .find((message) => message.role === 'user');
    if (!question) return null;
    const context =
      conversation.contexts.find((item) => item.id === question.contextId) ??
      conversation.contexts.at(-1);
    if (!context) return null;
    const existing = get().insights.find(
      (insight) => insight.assistantMessageId === assistantMessageId,
    );
    if (existing) return existing;

    const insight: SavedGPTInsight = {
      id: makeReaderGPTId(),
      conversationId: conversation.id,
      assistantMessageId,
      bookHash: conversation.hash,
      bookTitle: conversation.title,
      bookAuthor: conversation.author,
      ...(context.chapter ? { chapter: context.chapter } : {}),
      ...(context.locator ? { locator: context.locator } : {}),
      ...(context.href ? { href: context.href } : {}),
      ...(context.page ? { page: context.page } : {}),
      selectedPassage: context.quote,
      question: question.content,
      answer: assistant.content,
      createdAt: Date.now(),
    };
    await readerGPTRepository.saveInsight(insight);
    set((state) => ({ insights: [...state.insights, insight] }));
    return insight;
  },
}));
