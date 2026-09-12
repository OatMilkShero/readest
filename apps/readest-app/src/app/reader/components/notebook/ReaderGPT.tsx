'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LuCheck, LuKeyRound, LuPlus, LuQuote, LuSend, LuSparkles } from 'react-icons/lu';
import clsx from 'clsx';

import { useEnv } from '@/context/EnvContext';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderGPTStore } from '@/store/readerGPTStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { isTauriAppPlatform } from '@/services/environment';
import { eventDispatcher } from '@/utils/event';
import { streamReaderGPTResponse } from '@/services/reader-gpt/openai';
import {
  getOpenAITranslationAPIKey,
  saveOpenAITranslationAPIKey,
} from '@/services/translators/providers/openaiConfig';
import type { ReaderGPTBook } from '@/services/reader-gpt/types';
import {
  getReaderGPTConversationLabel,
  READER_GPT_MODELS,
  resolveReaderGPTModel,
  type ReaderGPTModel,
} from '@/services/reader-gpt/models';

const ReaderGPT: React.FC<{ bookKey: string }> = ({ bookKey }) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const getBookData = useBookDataStore((state) => state.getBookData);
  const { settings, setSettings, saveSettings } = useSettingsStore();
  const {
    currentSelection,
    activeConversation,
    conversations,
    messages,
    insights,
    focusedMessageId,
    isLoading,
    loadBook,
    newConversation,
    selectConversation,
    focusMessage,
    addCurrentSelection,
    addMessage,
    saveInsight,
  } = useReaderGPTStore();
  const [question, setQuestion] = useState('');
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [hasAPIKey, setHasAPIKey] = useState<boolean | null>(null);
  const [apiKeyDraft, setAPIKeyDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const abortRef = useRef<AbortController | null>(null);
  const model = resolveReaderGPTModel(settings.globalReadSettings.readerGPTModel);

  const book = getBookData(bookKey)?.book;
  const bookHash = bookKey.split('-')[0] ?? '';
  const bookInfo: ReaderGPTBook = {
    hash: bookHash,
    title: book?.title || _('Untitled'),
    author: book?.author || '',
  };

  useEffect(() => {
    void loadBook(bookHash);
    void getOpenAITranslationAPIKey()
      .then((key) => setHasAPIKey(!!key))
      .catch(() => setHasAPIKey(false));
    return () => abortRef.current?.abort();
  }, [bookHash, loadBook]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamingAnswer]);

  useEffect(() => {
    if (!focusedMessageId) return;
    requestAnimationFrame(() => {
      messageRefs.current.get(focusedMessageId)?.scrollIntoView({ block: 'center' });
    });
  }, [focusedMessageId, messages]);

  const handleModelChange = async (readerGPTModel: ReaderGPTModel) => {
    const updatedSettings = {
      ...settings,
      globalReadSettings: { ...settings.globalReadSettings, readerGPTModel },
    };
    setSettings(updatedSettings);
    await saveSettings(envConfig, updatedSettings);
  };

  const handleSaveAPIKey = async () => {
    if (!apiKeyDraft.trim()) return;
    setError('');
    try {
      await saveOpenAITranslationAPIKey(apiKeyDraft);
      setAPIKeyDraft('');
      setHasAPIKey(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : _('Could not save the API key'));
    }
  };

  const handleNewChat = async () => {
    if (isStreaming) return;
    await newConversation(bookInfo);
    setQuestion('');
    setStreamingAnswer('');
    setError('');
  };

  const handleAddSelection = async () => {
    if (!currentSelection || currentSelection.bookHash !== bookHash) return;
    await addCurrentSelection();
    eventDispatcher.dispatch('toast', {
      type: 'info',
      message: _('Selection added to chat'),
      timeout: 1600,
    });
  };

  const handleSend = async () => {
    const content = question.trim();
    if (!content || isStreaming || !hasAPIKey) return;
    setQuestion('');
    setError('');
    setStreamingAnswer('');

    let conversation = activeConversation;
    if (!conversation || conversation.hash !== bookHash) {
      conversation = await newConversation(bookInfo);
    }
    const contextId = conversation.contexts.at(-1)?.id;
    await addMessage('user', content, contextId);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    try {
      const state = useReaderGPTStore.getState();
      const answer = await streamReaderGPTResponse({
        conversation: state.activeConversation ?? conversation,
        messages: state.messages,
        model,
        signal: controller.signal,
        onDelta: (delta) => setStreamingAnswer((current) => current + delta),
      });
      if (answer.trim()) await addMessage('assistant', answer);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : _('OpenAI request failed'));
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setStreamingAnswer('');
    }
  };

  const handleSaveInsight = async (messageId: string) => {
    const insight = await saveInsight(messageId);
    if (!insight) return;
    eventDispatcher.dispatch('toast', {
      type: 'info',
      message: _('Insight saved for export'),
      timeout: 1800,
    });
  };

  if (hasAPIKey === null || isLoading) {
    return <div className='flex flex-1 items-center justify-center'>{_('Loading...')}</div>;
  }

  if (!hasAPIKey) {
    return (
      <div className='flex flex-1 flex-col justify-center gap-4 p-5'>
        <div className='flex items-center gap-2'>
          <LuKeyRound size={20} />
          <h2 className='text-lg font-semibold tracking-tight'>{_('Connect OpenAI')}</h2>
        </div>
        <p className='text-base-content/70 text-sm leading-relaxed'>
          {isTauriAppPlatform()
            ? _(
                'Your API key is stored in the device secure store and is never saved in book data.',
              )
            : _(
                'In the web reader, your API key lasts only for this browser session and is never saved in book data.',
              )}
        </p>
        <input
          type='password'
          value={apiKeyDraft}
          onChange={(event) => setAPIKeyDraft(event.target.value)}
          placeholder='sk-…'
          className='input input-bordered eink-bordered w-full'
          autoComplete='off'
        />
        {error && <p className='text-error text-sm'>{error}</p>}
        <button
          type='button'
          className='btn btn-contrast'
          disabled={!apiKeyDraft.trim()}
          onClick={handleSaveAPIKey}
        >
          {_('Save API Key')}
        </button>
      </div>
    );
  }

  const selectionAvailable =
    !!currentSelection &&
    currentSelection.bookHash === bookHash &&
    !activeConversation?.contexts.some(
      (context) =>
        context.locator === currentSelection.locator && context.quote === currentSelection.quote,
    );

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='border-base-300/50 flex items-center gap-2 border-b px-3 py-2'>
        <select
          className='select select-bordered select-sm eink-bordered min-w-0 flex-1'
          value={activeConversation?.id ?? ''}
          onChange={(event) => void selectConversation(event.target.value)}
          aria-label={_('Conversation')}
        >
          {!activeConversation && <option value=''>{_('New conversation')}</option>}
          {conversations.map((conversation) => (
            <option key={conversation.id} value={conversation.id}>
              {new Date(conversation.updatedAt).toLocaleDateString()} ·{' '}
              {getReaderGPTConversationLabel(conversation)}
            </option>
          ))}
        </select>
        <button
          type='button'
          className='btn btn-ghost btn-sm eink-bordered'
          onClick={() => void handleNewChat()}
          disabled={isStreaming}
          title={_('New Chat')}
        >
          <LuPlus />
          <span className='hidden sm:inline'>{_('New Chat')}</span>
        </button>
      </div>

      <div className='border-base-300/50 flex items-center gap-2 border-b px-3 py-2'>
        <LuQuote className='shrink-0' />
        <p className='text-base-content/70 min-w-0 flex-1 truncate text-xs'>
          {activeConversation?.contexts.at(-1)?.quote || _('Select a passage to add context')}
        </p>
        <button
          type='button'
          className='btn btn-ghost btn-xs eink-bordered whitespace-nowrap'
          onClick={() => void handleAddSelection()}
          disabled={!selectionAvailable || isStreaming}
        >
          {_('Add current selection')}
        </button>
      </div>

      <div ref={scrollRef} className='min-h-0 flex-1 space-y-3 overflow-y-auto p-3'>
        {(activeConversation?.contexts ?? []).map((context) => (
          <blockquote
            key={context.id}
            className='eink-bordered border-base-300 bg-base-100/60 rounded-lg border p-3 text-sm'
          >
            <div className='text-base-content/60 mb-1 text-xs'>
              {[context.chapter, context.page ? `${_('Page')} ${context.page}` : null]
                .filter(Boolean)
                .join(' · ') || _('Selected passage')}
            </div>
            <p className='line-clamp-4 select-text whitespace-pre-wrap'>{context.quote}</p>
          </blockquote>
        ))}

        {messages.map((message) => {
          const saved = insights.some((insight) => insight.assistantMessageId === message.id);
          return (
            <div
              key={message.id}
              ref={(element) => {
                if (element) messageRefs.current.set(message.id, element);
                else messageRefs.current.delete(message.id);
              }}
              className={clsx(
                message.role === 'user'
                  ? 'bg-base-content text-base-100 ms-8 rounded-lg p-3'
                  : 'eink-bordered border-base-300 bg-base-100 me-8 rounded-lg border p-3',
                focusedMessageId === message.id && 'ring-primary ring-2 ring-offset-2',
              )}
              onClick={() => focusedMessageId === message.id && focusMessage(null)}
            >
              <p className='select-text whitespace-pre-wrap text-sm leading-relaxed'>
                {message.content}
              </p>
              {message.role === 'assistant' && (
                <button
                  type='button'
                  className='btn btn-ghost btn-xs mt-2 eink-bordered'
                  disabled={saved}
                  onClick={() => void handleSaveInsight(message.id)}
                >
                  {saved ? <LuCheck /> : <LuSparkles />}
                  {saved ? _('Saved') : _('Save Insight')}
                </button>
              )}
            </div>
          );
        })}

        {isStreaming && (
          <div className='eink-bordered border-base-300 bg-base-100 me-8 rounded-lg border p-3'>
            <p className='select-text whitespace-pre-wrap text-sm leading-relaxed'>
              {streamingAnswer || _('Thinking...')}
            </p>
          </div>
        )}
        {error && <p className='text-error px-1 text-sm'>{error}</p>}
      </div>

      <div className='border-base-300/50 border-t p-3'>
        <div className='eink-bordered border-base-300 bg-base-100 flex items-end gap-2 rounded-lg border p-2'>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            className='min-h-12 flex-1 resize-none bg-transparent p-1 text-sm outline-hidden'
            placeholder={_('Ask about the selected passage...')}
            disabled={isStreaming}
          />
          <button
            type='button'
            className='btn btn-contrast btn-circle btn-sm shrink-0'
            onClick={() => void handleSend()}
            disabled={!question.trim() || isStreaming}
            aria-label={_('Send')}
          >
            <LuSend />
          </button>
        </div>
        <div className='mt-1 flex items-center justify-center gap-1 text-[10px]'>
          <select
            aria-label={_('GPT model')}
            className='text-base-content/60 max-w-44 bg-transparent outline-hidden'
            value={model}
            disabled={isStreaming}
            onChange={(event) => void handleModelChange(resolveReaderGPTModel(event.target.value))}
          >
            {READER_GPT_MODELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className='text-base-content/50'>
            · {_('Only selected passages and this chat are sent')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReaderGPT;
