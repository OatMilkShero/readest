import { describe, expect, it } from 'vitest';

import { filterReadingKnowledge, normalizeReadingKnowledge } from '@/services/knowledge/normalize';
import { renderKnowledgeMarkdown } from '@/services/knowledge/markdown';

describe('reading knowledge Markdown export', () => {
  it('combines Readest annotations and saved GPT insights by chapter', () => {
    const knowledge = normalizeReadingKnowledge({
      book: {
        hash: 'book-hash',
        title: 'The Test Book',
        author: 'Ada Reader',
        tags: ['philosophy'],
      },
      annotationGroups: [
        {
          id: 1,
          href: 'chapter-1.xhtml',
          label: 'Chapter One',
          booknotes: [
            {
              id: 'note-1',
              type: 'annotation',
              cfi: 'epubcfi(/6/2!/4/2:0)',
              page: 12,
              text: 'A highlighted claim.',
              note: 'My marginal note.',
              style: 'highlight',
              color: 'yellow',
              createdAt: 1,
              updatedAt: 2,
            },
          ],
        },
      ],
      insights: [
        {
          id: 'insight-1',
          conversationId: 'conversation-1',
          assistantMessageId: 'assistant-1',
          bookHash: 'book-hash',
          bookTitle: 'The Test Book',
          bookAuthor: 'Ada Reader',
          chapter: 'Chapter One',
          locator: 'epubcfi(/6/2!/4/8:0)',
          page: 13,
          selectedPassage: 'A difficult passage.',
          question: 'What does this mean?',
          answer: 'It distinguishes two kinds of knowledge.',
          createdAt: 3,
        },
      ],
    });

    const markdown = renderKnowledgeMarkdown(knowledge, { linkType: 'app' });

    expect(markdown).toContain('source: Readest');
    expect(markdown).toContain('readest-hash: "book-hash"');
    expect(markdown).toContain('## Chapter One');
    expect(markdown).toContain('### Highlight');
    expect(markdown).toContain('> A highlighted claim.');
    expect(markdown).toContain('**My note**\n\nMy marginal note.');
    expect(markdown).toContain('### GPT Insight');
    expect(markdown).toContain('**Me**\n\nWhat does this mean?');
    expect(markdown).toContain('**GPT**\n\nIt distinguishes two kinds of knowledge.');
    expect(markdown).toContain('[Open in Readest](readest://book/book-hash/annotation/');
    expect(markdown).toMatch(/\^rdst-[a-z0-9]+/);
  });
});

describe('reading knowledge export scope', () => {
  const knowledge = normalizeReadingKnowledge({
    book: { hash: 'book-hash', title: 'Book', author: 'Author', tags: [] },
    annotationGroups: [
      {
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
    ],
    insights: [
      {
        id: 'insight',
        conversationId: 'conversation',
        assistantMessageId: 'assistant',
        bookHash: 'book-hash',
        bookTitle: 'Book',
        bookAuthor: 'Author',
        chapter: 'Chapter',
        selectedPassage: 'Insight passage',
        question: 'Insight question',
        answer: 'Insight answer',
        createdAt: 4,
      },
    ],
  });

  const ids = (highlights: boolean, notes: boolean, gptInsights = false) =>
    filterReadingKnowledge(knowledge, { highlights, notes, gptInsights }).chapters.flatMap(
      (chapter) => chapter.entries.map((entry) => entry.id),
    );

  it('filters highlights and notes as overlapping facets', () => {
    expect(ids(true, false)).toEqual(['highlight-only', 'overlap']);
    expect(ids(false, true)).toEqual(['note-only', 'overlap']);
  });

  it('exports the highlight and note union with overlapping items only once', () => {
    expect(ids(true, true)).toEqual(['highlight-only', 'note-only', 'overlap']);
    expect(ids(true, true).filter((id) => id === 'overlap')).toHaveLength(1);
  });

  it('keeps GPT Insights as an independently selectable category', () => {
    expect(ids(false, false, true)).toEqual(['insight']);
  });

  it('updates rendered preview content when the selected scope changes', () => {
    const highlightsPreview = renderKnowledgeMarkdown(
      filterReadingKnowledge(knowledge, { highlights: true, notes: false, gptInsights: false }),
      { linkType: 'app' },
    );
    const notesPreview = renderKnowledgeMarkdown(
      filterReadingKnowledge(knowledge, { highlights: false, notes: true, gptInsights: false }),
      { linkType: 'app' },
    );

    expect(highlightsPreview).toContain('Highlight only text');
    expect(highlightsPreview).not.toContain('Note only text');
    expect(notesPreview).not.toContain('Highlight only text');
    expect(notesPreview).toContain('Note only text');
    expect(notesPreview.match(/Overlap quote/g)).toHaveLength(1);
    expect(notesPreview).toContain('Overlap note');
  });
});
