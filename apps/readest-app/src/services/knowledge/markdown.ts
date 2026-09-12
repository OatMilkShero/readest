import type { AnnotationLinkType } from '@/utils/deeplink';
import { buildAnnotationUrl } from '@/utils/deeplink';
import type { KnowledgeEntry, ReadingKnowledge } from './types';

const yamlQuote = (value: string): string =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')}"`;

const blockQuote = (value: string): string =>
  value
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');

// Algorithm adapted from polybjorn/obsidian-readest-highlights (MIT): stable
// location-derived IDs keep Obsidian block references valid after re-export.
const stableBlockId = (entry: KnowledgeEntry): string => {
  const key = `${entry.kind}:${entry.locator ?? entry.page ?? ''}:${entry.id}`;
  let hash = 5381;
  for (let index = 0; index < key.length; index++) {
    hash = ((hash << 5) + hash + key.charCodeAt(index)) | 0;
  }
  return `rdst-${(hash >>> 0).toString(36)}`;
};

export const renderKnowledgeMarkdown = (
  knowledge: ReadingKnowledge,
  {
    linkType,
    includeTitle = true,
    includeAuthor = true,
    includeDate = true,
    includeChapterTitles = true,
    includeQuotes = true,
    includeNotes = true,
    includePageNumber = true,
    includeTimestamp = true,
    includeChapterSeparator = true,
  }: {
    linkType: AnnotationLinkType;
    includeTitle?: boolean;
    includeAuthor?: boolean;
    includeDate?: boolean;
    includeChapterTitles?: boolean;
    includeQuotes?: boolean;
    includeNotes?: boolean;
    includePageNumber?: boolean;
    includeTimestamp?: boolean;
    includeChapterSeparator?: boolean;
  },
): string => {
  const { book, chapters } = knowledge;
  const lines = [
    '---',
    `title: ${yamlQuote(book.title)}`,
    ...(includeAuthor && book.author ? [`author: ${yamlQuote(book.author)}`] : []),
    'source: Readest',
    `readest-hash: ${yamlQuote(book.hash)}`,
  ];
  if (book.tags.length > 0) {
    lines.push('tags:', ...book.tags.map((tag) => `  - ${yamlQuote(tag)}`));
  }
  lines.push('---', '');
  if (includeTitle) lines.push(`# ${book.title}`, '');
  if (includeDate)
    lines.push(`**Exported from Readest**: ${new Date().toISOString().slice(0, 10)}`, '');

  for (const [chapterIndex, chapter] of chapters.entries()) {
    if (includeChapterTitles) lines.push(`## ${chapter.title}`, '');
    for (const entry of chapter.entries) {
      lines.push(entry.kind === 'gpt-insight' ? '### GPT Insight' : '### Highlight', '');
      if (includeQuotes && entry.quote) lines.push(blockQuote(entry.quote), '');
      if (includeNotes && entry.kind === 'annotation' && entry.note) {
        lines.push('**My note**', '', entry.note, '');
      }
      if (entry.kind === 'gpt-insight') {
        lines.push('**Me**', '', entry.question, '', '**GPT**', '', entry.answer, '');
      }
      if (entry.locator) {
        const link = buildAnnotationUrl(
          { bookHash: book.hash, noteId: entry.id, cfi: entry.locator },
          linkType,
        );
        lines.push(`[Open in Readest](${link})`, '');
      }
      const metadata = [
        includePageNumber && entry.page ? `Page: ${entry.page}` : '',
        includeTimestamp ? `Time: ${new Date(entry.timestamp).toLocaleString()}` : '',
      ].filter(Boolean);
      if (metadata.length > 0) lines.push(`*${metadata.join(' · ')}*`, '');
      lines.push(`^${stableBlockId(entry)}`, '');
    }
    if (includeChapterSeparator && chapterIndex < chapters.length - 1) lines.push('---', '');
  }

  return `${lines.join('\n').trimEnd()}\n`;
};
