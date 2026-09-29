import { describe, test, expect, beforeEach } from 'vitest';
import { useNotebookStore } from '@/store/notebookStore';
import { useReaderGPTStore } from '@/store/readerGPTStore';
import type { ReaderGPTConversation, ReaderGPTSelection } from '@/services/reader-gpt/types';

beforeEach(() => {
  useNotebookStore.setState({
    notebookWidth: '',
    isNotebookVisible: false,
    isNotebookPinned: false,
    notebookActiveTab: 'notes',
  });
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
});

describe('notebookStore', () => {
  describe('toggleNotebook', () => {
    test('toggles visibility from false to true', () => {
      useNotebookStore.getState().toggleNotebook();
      expect(useNotebookStore.getState().isNotebookVisible).toBe(true);
    });

    test('toggles visibility from true to false', () => {
      useNotebookStore.getState().setNotebookVisible(true);
      useNotebookStore.getState().toggleNotebook();
      expect(useNotebookStore.getState().isNotebookVisible).toBe(false);
    });
  });

  describe('setNotebookVisible', () => {
    test('sets visibility to true', () => {
      useNotebookStore.getState().setNotebookVisible(true);
      expect(useNotebookStore.getState().isNotebookVisible).toBe(true);
    });

    test('sets visibility to false', () => {
      useNotebookStore.getState().setNotebookVisible(true);
      useNotebookStore.getState().setNotebookVisible(false);
      expect(useNotebookStore.getState().isNotebookVisible).toBe(false);
    });
  });

  describe('getIsNotebookVisible', () => {
    test('returns current visibility', () => {
      expect(useNotebookStore.getState().getIsNotebookVisible()).toBe(false);
      useNotebookStore.getState().setNotebookVisible(true);
      expect(useNotebookStore.getState().getIsNotebookVisible()).toBe(true);
    });
  });

  describe('toggleNotebookPin', () => {
    test('toggles pin from false to true', () => {
      useNotebookStore.getState().toggleNotebookPin();
      expect(useNotebookStore.getState().isNotebookPinned).toBe(true);
    });

    test('toggles pin from true to false', () => {
      useNotebookStore.getState().setNotebookPin(true);
      useNotebookStore.getState().toggleNotebookPin();
      expect(useNotebookStore.getState().isNotebookPinned).toBe(false);
    });
  });

  describe('setNotebookPin', () => {
    test('sets pinned to true', () => {
      useNotebookStore.getState().setNotebookPin(true);
      expect(useNotebookStore.getState().isNotebookPinned).toBe(true);
    });

    test('sets pinned to false', () => {
      useNotebookStore.getState().setNotebookPin(true);
      useNotebookStore.getState().setNotebookPin(false);
      expect(useNotebookStore.getState().isNotebookPinned).toBe(false);
    });
  });

  describe('setNotebookWidth / getNotebookWidth', () => {
    test('sets and gets width', () => {
      useNotebookStore.getState().setNotebookWidth('400px');
      expect(useNotebookStore.getState().getNotebookWidth()).toBe('400px');
    });

    test('defaults to empty string', () => {
      expect(useNotebookStore.getState().getNotebookWidth()).toBe('');
    });
  });

  describe('setNotebookActiveTab', () => {
    test('sets active tab to ai', () => {
      useNotebookStore.getState().setNotebookActiveTab('ai');
      expect(useNotebookStore.getState().notebookActiveTab).toBe('ai');
    });

    test('sets active tab to notes', () => {
      useNotebookStore.getState().setNotebookActiveTab('ai');
      useNotebookStore.getState().setNotebookActiveTab('notes');
      expect(useNotebookStore.getState().notebookActiveTab).toBe('notes');
    });

    test('switches through Reader GPT without resetting its conversation or selection context', () => {
      const selection: ReaderGPTSelection = {
        id: 'selection-1',
        bookHash: 'book',
        bookTitle: 'Book',
        bookAuthor: 'Author',
        quote: 'Selected passage',
        createdAt: 100,
      };
      const conversation: ReaderGPTConversation = {
        id: 'conversation-1',
        hash: 'book',
        title: 'Book',
        author: 'Author',
        contexts: [selection],
        createdAt: 100,
        updatedAt: 200,
      };
      useReaderGPTStore.setState({
        currentBookHash: 'book',
        currentSelection: selection,
        activeConversation: conversation,
        conversations: [conversation],
      });

      useNotebookStore.getState().setNotebookActiveTab('gpt');
      useNotebookStore.getState().setNotebookActiveTab('notes');
      useNotebookStore.getState().setNotebookActiveTab('gpt');

      expect(useReaderGPTStore.getState()).toMatchObject({
        currentBookHash: 'book',
        currentSelection: selection,
        activeConversation: conversation,
        conversations: [conversation],
      });
    });

    test('defaults to notes', () => {
      expect(useNotebookStore.getState().notebookActiveTab).toBe('notes');
    });
  });

  describe('initial state', () => {
    test('has correct defaults', () => {
      const state = useNotebookStore.getState();
      expect(state.notebookWidth).toBe('');
      expect(state.isNotebookVisible).toBe(false);
      expect(state.isNotebookPinned).toBe(false);
      expect(state.notebookActiveTab).toBe('notes');
    });
  });
});
