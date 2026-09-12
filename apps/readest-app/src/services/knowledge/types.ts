export interface KnowledgeBook {
  hash: string;
  title: string;
  author: string;
  tags: string[];
}

export interface KnowledgeLocation {
  chapter: string;
  locator?: string;
  page?: number;
}

export interface KnowledgeAnnotation extends KnowledgeLocation {
  kind: 'annotation';
  id: string;
  quote: string;
  note: string;
  timestamp: number;
}

export interface KnowledgeGPTInsight extends KnowledgeLocation {
  kind: 'gpt-insight';
  id: string;
  quote: string;
  question: string;
  answer: string;
  timestamp: number;
}

export type KnowledgeEntry = KnowledgeAnnotation | KnowledgeGPTInsight;

export interface KnowledgeChapter {
  title: string;
  entries: KnowledgeEntry[];
}

export interface ReadingKnowledge {
  book: KnowledgeBook;
  chapters: KnowledgeChapter[];
}
