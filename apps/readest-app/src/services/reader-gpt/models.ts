import type { ReaderGPTConversation } from './types';

export const READER_GPT_MODELS = [
  { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna — Fast' },
  { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra — Balanced' },
  { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol — Deep' },
] as const;

export type ReaderGPTModel = (typeof READER_GPT_MODELS)[number]['value'];

export const DEFAULT_READER_GPT_MODEL: ReaderGPTModel = 'gpt-5.6-terra';

export const resolveReaderGPTModel = (model?: string): ReaderGPTModel =>
  READER_GPT_MODELS.some((option) => option.value === model)
    ? (model as ReaderGPTModel)
    : DEFAULT_READER_GPT_MODEL;

const truncateLabel = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 49 ? `${normalized.slice(0, 48).trimEnd()}…` : normalized;
};

export const getReaderGPTConversationLabel = (conversation: ReaderGPTConversation): string =>
  truncateLabel(
    conversation.conversationTitle || conversation.contexts[0]?.quote || 'New conversation',
  );
