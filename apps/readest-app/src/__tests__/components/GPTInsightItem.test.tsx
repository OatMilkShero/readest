import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GPTInsightItem from '@/app/reader/components/sidebar/GPTInsightItem';
import type { SavedGPTInsight } from '@/services/reader-gpt/types';

const mocks = vi.hoisted(() => ({
  selectConversation: vi.fn(async () => undefined),
  focusMessage: vi.fn(),
  goTo: vi.fn(),
  setNotebookVisible: vi.fn(),
  setNotebookActiveTab: vi.fn(),
}));

vi.mock('@/store/readerGPTStore', () => ({
  useReaderGPTStore: () => ({
    selectConversation: mocks.selectConversation,
    focusMessage: mocks.focusMessage,
  }),
}));

vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ getView: () => ({ goTo: mocks.goTo }) }),
}));

vi.mock('@/store/notebookStore', () => ({
  useNotebookStore: () => ({
    setNotebookVisible: mocks.setNotebookVisible,
    setNotebookActiveTab: mocks.setNotebookActiveTab,
  }),
}));

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (value: string) => value }));
vi.mock('@/utils/event', () => ({ eventDispatcher: { dispatch: vi.fn() } }));

const insight: SavedGPTInsight = {
  id: 'insight-1',
  conversationId: 'conversation-1',
  assistantMessageId: 'assistant-1',
  bookHash: 'book-1',
  bookTitle: 'The Book',
  bookAuthor: 'The Author',
  chapter: 'Chapter One',
  locator: 'epubcfi(/6/4!/4/2:0)',
  selectedPassage: 'The selected passage',
  question: 'What does this mean?',
  answer: 'A concise explanation.',
  createdAt: 1,
};

describe('GPTInsightItem', () => {
  it('is visibly distinguished and reopens its saved exchange', async () => {
    render(<GPTInsightItem bookKey='book-1' insight={insight} />);

    expect(screen.getByText('GPT Insight')).toBeTruthy();
    expect(screen.getByText('What does this mean?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open saved GPT insight' }));

    await waitFor(() => expect(mocks.selectConversation).toHaveBeenCalledWith('conversation-1'));
    expect(mocks.focusMessage).toHaveBeenCalledWith('assistant-1');
    expect(mocks.setNotebookActiveTab).toHaveBeenCalledWith('gpt');
    expect(mocks.setNotebookVisible).toHaveBeenCalledWith(true);
    expect(mocks.goTo).toHaveBeenCalledWith(insight.locator);
  });
});
