import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ExportMarkdownDialog from '@/app/reader/components/annotator/ExportMarkdownDialog';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (value: string) => value,
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: null }),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: { globalReadSettings: {} } }),
}));

vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({
    getBookData: () => ({
      book: { hash: 'book-hash', title: 'Book', author: 'Author', tags: [] },
    }),
  }),
}));

vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ getViewSettings: () => undefined }),
}));

vi.mock('@/helpers/settings', () => ({ saveViewSettings: vi.fn() }));

vi.mock('@/components/Dialog', () => ({
  default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}));

describe('ExportMarkdownDialog knowledge scope preview', () => {
  it('updates immediately from the highlight+note union to notes only', () => {
    render(
      <ExportMarkdownDialog
        bookKey='book-key'
        bookHash='book-hash'
        bookTitle='Book'
        bookAuthor='Author'
        bookFormat='EPUB'
        isOpen
        booknoteGroups={{
          chapter: {
            id: 1,
            href: 'chapter.xhtml',
            label: 'Chapter',
            booknotes: [
              {
                id: 'highlight-only',
                type: 'annotation',
                cfi: 'cfi-1',
                text: 'Highlight only text',
                note: '',
                style: 'highlight',
                color: 'yellow',
                createdAt: 1,
                updatedAt: 1,
              },
              {
                id: 'note-only',
                type: 'annotation',
                cfi: 'cfi-2',
                text: '',
                note: 'Note only text',
                style: 'highlight',
                color: 'yellow',
                createdAt: 2,
                updatedAt: 2,
              },
              {
                id: 'overlap',
                type: 'annotation',
                cfi: 'cfi-3',
                text: 'Overlap quote',
                note: 'Overlap note',
                style: 'highlight',
                color: 'yellow',
                createdAt: 3,
                updatedAt: 3,
              },
            ],
          },
        }}
        insights={[]}
        onCancel={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    expect(screen.getByText('Highlight only text')).toBeTruthy();
    expect(screen.getByText('Note only text')).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Highlights' }));

    expect(screen.queryByText('Highlight only text')).toBeNull();
    expect(screen.getByText('Note only text')).toBeTruthy();
    expect(screen.getAllByText('Overlap quote')).toHaveLength(1);
    expect(screen.getByText('Overlap note')).toBeTruthy();
  });
});
