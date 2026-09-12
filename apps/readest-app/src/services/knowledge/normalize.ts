import type { Book, BooknoteGroup } from '@/types/book';
import type { SavedGPTInsight } from '@/services/reader-gpt/types';
import type { KnowledgeChapter, KnowledgeEntry, ReadingKnowledge } from './types';

export const normalizeReadingKnowledge = ({
  book,
  annotationGroups,
  insights,
}: {
  book: Pick<Book, 'hash' | 'title' | 'author' | 'tags'>;
  annotationGroups: BooknoteGroup[];
  insights: SavedGPTInsight[];
}): ReadingKnowledge => {
  const chapters = new Map<string, KnowledgeEntry[]>();
  const append = (chapter: string, entry: KnowledgeEntry) => {
    const entries = chapters.get(chapter) ?? [];
    entries.push(entry);
    chapters.set(chapter, entries);
  };

  for (const group of annotationGroups) {
    const chapter = group.label || 'Untitled';
    for (const note of group.booknotes) {
      if (note.deletedAt || (!note.text && !note.note)) continue;
      append(chapter, {
        kind: 'annotation',
        id: note.id,
        chapter,
        ...(note.cfi ? { locator: note.cfi } : {}),
        ...(note.page ? { page: note.page } : {}),
        quote: note.text ?? '',
        note: note.note ?? '',
        timestamp: note.updatedAt || note.createdAt,
      });
    }
  }

  for (const insight of insights) {
    const chapter = insight.chapter || 'Untitled';
    append(chapter, {
      kind: 'gpt-insight',
      id: insight.id,
      chapter,
      ...(insight.locator ? { locator: insight.locator } : {}),
      ...(insight.page ? { page: insight.page } : {}),
      quote: insight.selectedPassage,
      question: insight.question,
      answer: insight.answer,
      timestamp: insight.createdAt,
    });
  }

  const normalizedChapters: KnowledgeChapter[] = [...chapters.entries()].map(
    ([title, entries]) => ({
      title,
      entries: entries.sort((a, b) => {
        if (a.page && b.page && a.page !== b.page) return a.page - b.page;
        return a.timestamp - b.timestamp;
      }),
    }),
  );

  return {
    book: {
      hash: book.hash,
      title: book.title,
      author: book.author,
      tags: book.tags ?? [],
    },
    chapters: normalizedChapters,
  };
};
