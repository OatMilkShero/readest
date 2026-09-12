import React from 'react';
import { LuSparkles } from 'react-icons/lu';

import { useTranslation } from '@/hooks/useTranslation';
import type { SavedGPTInsight } from '@/services/reader-gpt/types';
import { useNotebookStore } from '@/store/notebookStore';
import { useReaderGPTStore } from '@/store/readerGPTStore';
import { useReaderStore } from '@/store/readerStore';
import { eventDispatcher } from '@/utils/event';

const GPTInsightItem: React.FC<{ bookKey: string; insight: SavedGPTInsight }> = ({
  bookKey,
  insight,
}) => {
  const _ = useTranslation();
  const { selectConversation, focusMessage } = useReaderGPTStore();
  const { getView } = useReaderStore();
  const { setNotebookVisible, setNotebookActiveTab } = useNotebookStore();

  const handleOpen = async () => {
    if (insight.locator) {
      eventDispatcher.dispatch('navigate', { bookKey, cfi: insight.locator });
      getView(bookKey)?.goTo(insight.locator);
    }
    await selectConversation(insight.conversationId);
    focusMessage(insight.assistantMessageId);
    setNotebookActiveTab('gpt');
    setNotebookVisible(true);
  };

  return (
    <li className='py-1'>
      <button
        type='button'
        className='eink-bordered border-base-300 bg-base-100 hover:bg-base-200/50 w-full rounded-lg border p-3 text-start'
        aria-label={_('Open saved GPT insight')}
        onClick={() => void handleOpen()}
      >
        <span className='text-primary mb-1 flex items-center gap-1.5 text-xs font-medium'>
          <LuSparkles aria-hidden='true' />
          {_('GPT Insight')}
        </span>
        <span className='line-clamp-2 block text-sm font-medium'>{insight.question}</span>
        <span className='text-base-content/65 mt-1 line-clamp-2 block text-xs leading-relaxed'>
          {insight.answer}
        </span>
        {(insight.page || insight.selectedPassage) && (
          <span className='text-base-content/50 mt-2 block truncate text-[11px]'>
            {insight.page ? `${_('Page')} ${insight.page} · ` : ''}
            {insight.selectedPassage}
          </span>
        )}
      </button>
    </li>
  );
};

export default GPTInsightItem;
