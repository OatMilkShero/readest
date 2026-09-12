export interface ReaderGPTBook {
  hash: string;
  title: string;
  author: string;
}

export interface ReaderGPTSelection {
  id: string;
  bookHash: string;
  bookTitle: string;
  bookAuthor: string;
  quote: string;
  chapter?: string;
  locator?: string;
  href?: string;
  page?: number;
  createdAt: number;
}

export interface ReaderGPTConversation extends ReaderGPTBook {
  id: string;
  conversationTitle?: string;
  contexts: ReaderGPTSelection[];
  createdAt: number;
  updatedAt: number;
}

export interface ReaderGPTMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  contextId?: string;
  createdAt: number;
}

export interface SavedGPTInsight {
  id: string;
  conversationId: string;
  assistantMessageId: string;
  bookHash: string;
  bookTitle: string;
  bookAuthor: string;
  chapter?: string;
  locator?: string;
  href?: string;
  page?: number;
  selectedPassage: string;
  question: string;
  answer: string;
  createdAt: number;
}
