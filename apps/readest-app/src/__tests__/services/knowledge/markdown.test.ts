import { describe, expect, it } from 'vitest';

import { normalizeReadingKnowledge } from '@/services/knowledge/normalize';
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
