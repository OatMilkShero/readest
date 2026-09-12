import type { ReaderGPTConversation, ReaderGPTMessage, SavedGPTInsight } from './types';

const DB_NAME = 'readest-reader-gpt';
const DB_VERSION = 1;
const CONVERSATIONS_STORE = 'conversations';
const MESSAGES_STORE = 'messages';
const INSIGHTS_STORE = 'insights';

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

class ReaderGPTRepository {
  private database: IDBDatabase | null = null;

  private async open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
        store.createIndex('bookHash', 'hash', { unique: false });
      }
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
      }
      if (!db.objectStoreNames.contains(INSIGHTS_STORE)) {
        const store = db.createObjectStore(INSIGHTS_STORE, { keyPath: 'id' });
        store.createIndex('bookHash', 'bookHash', { unique: false });
      }
    };
    this.database = await requestResult(request);
    return this.database;
  }

  async saveConversation(conversation: ReaderGPTConversation): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    transaction.objectStore(CONVERSATIONS_STORE).put(conversation);
    await transactionDone(transaction);
  }

  async getConversations(bookHash: string): Promise<ReaderGPTConversation[]> {
    const db = await this.open();
    const result = await requestResult(
      db
        .transaction(CONVERSATIONS_STORE, 'readonly')
        .objectStore(CONVERSATIONS_STORE)
        .index('bookHash')
        .getAll(bookHash),
    );
    return (result as ReaderGPTConversation[]).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveMessage(message: ReaderGPTMessage): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
    transaction.objectStore(MESSAGES_STORE).put(message);
    await transactionDone(transaction);
  }

  async getMessages(conversationId: string): Promise<ReaderGPTMessage[]> {
    const db = await this.open();
    const result = await requestResult(
      db
        .transaction(MESSAGES_STORE, 'readonly')
        .objectStore(MESSAGES_STORE)
        .index('conversationId')
        .getAll(conversationId),
    );
    return (result as ReaderGPTMessage[]).sort((a, b) => a.createdAt - b.createdAt);
  }

  async saveInsight(insight: SavedGPTInsight): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(INSIGHTS_STORE, 'readwrite');
    transaction.objectStore(INSIGHTS_STORE).put(insight);
    await transactionDone(transaction);
  }

  async getInsights(bookHash: string): Promise<SavedGPTInsight[]> {
    const db = await this.open();
    const result = await requestResult(
      db
        .transaction(INSIGHTS_STORE, 'readonly')
        .objectStore(INSIGHTS_STORE)
        .index('bookHash')
        .getAll(bookHash),
    );
    return (result as SavedGPTInsight[]).sort((a, b) => a.createdAt - b.createdAt);
  }
}

export const readerGPTRepository = new ReaderGPTRepository();

export const makeReaderGPTId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
