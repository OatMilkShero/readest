/**
 * LangPanel — "Enable Translation" availability gate (issue #5600).
 *
 * Translation is not available for PDFs, and the reader's toolbar toggler has
 * always refused to turn it on for them. Settings → Language offered the same
 * switch with no gate, so turning it on there translated the PDF text layer
 * paragraph by paragraph and burned the daily AI translation quota — after
 * which every selection popped a "Daily translation quota reached" toast.
 *
 * The switch must follow the toolbar's rule: off + unavailable => locked, but
 * an already-on book stays toggleable so the user can turn it back off.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

import LangPanel from '@/components/settings/LangPanel';
import type { Book, BookFormat, ViewSettings } from '@/types/book';

const state = vi.hoisted(() => ({
  format: 'EPUB' as BookFormat,
  primaryLanguage: 'fr',
  translationEnabled: false,
  translationProvider: 'deepl',
  getOpenAIKey: vi.fn(),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string) => s,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ token: null }),
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {} }),
}));

vi.mock('@/helpers/settings', () => ({
  saveViewSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/translators/providers/openaiConfig', () => ({
  DEFAULT_OPENAI_TRANSLATION_MODEL: 'gpt-5.6-luna',
  getOpenAITranslationAPIKey: state.getOpenAIKey,
  saveOpenAITranslationAPIKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
  },
}));

vi.mock('@/hooks/useResetSettings', () => ({
  useResetViewSettings: () => vi.fn(),
}));

vi.mock('@/hooks/useKeyDownActions', () => ({
  useKeyDownActions: () => {},
}));

const viewSettings = () =>
  ({
    uiLanguage: '',
    translationEnabled: state.translationEnabled,
    translationProvider: state.translationProvider,
    translateTargetLang: 'en',
    showTranslateSource: true,
    ttsReadAloudText: 'both',
    replaceQuotationMarks: false,
    convertChineseVariant: 'none',
  }) as unknown as ViewSettings;

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: {
      globalViewSettings: viewSettings(),
      globalReadSettings: { openAITranslationModel: 'gpt-5.6-luna' },
    },
    setSettings: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    applyUILanguage: vi.fn(),
    activeSettingsItemId: null,
    setActiveSettingsItemId: vi.fn(),
  }),
}));

vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getView: () => null,
    getViewSettings: () => viewSettings(),
    setViewSettings: vi.fn(),
    recreateViewer: vi.fn(),
  }),
}));

vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({
    getBookData: () => ({
      book: { format: state.format, primaryLanguage: state.primaryLanguage } as Book,
    }),
  }),
}));

const getEnableTranslationToggle = () => {
  const row = screen.getByText('Enable Translation').closest('label')!;
  return row.querySelector('input[type="checkbox"]') as HTMLInputElement;
};

describe('LangPanel — Enable Translation availability', () => {
  beforeEach(() => {
    state.format = 'EPUB';
    state.primaryLanguage = 'fr';
    state.translationEnabled = false;
    state.translationProvider = 'deepl';
    state.getOpenAIKey.mockReset().mockResolvedValue('sk-test');
  });

  afterEach(() => {
    cleanup();
  });

  it('allows enabling translation for a translatable book', () => {
    render(<LangPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    expect(getEnableTranslationToggle().disabled).toBe(false);
    expect(screen.queryByText('Not available for this book.')).toBeNull();
  });

  it('locks the switch for a PDF, where translation is not available', () => {
    state.format = 'PDF';

    render(<LangPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    expect(getEnableTranslationToggle().disabled).toBe(true);
    expect(screen.getByText('Not available for this book.')).toBeTruthy();
  });

  it('locks the switch when the book is already in the target language', () => {
    state.primaryLanguage = 'en';

    render(<LangPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    expect(getEnableTranslationToggle().disabled).toBe(true);
  });

  it('keeps the switch usable on a PDF that already has translation on', () => {
    state.format = 'PDF';
    state.translationEnabled = true;

    render(<LangPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    expect(getEnableTranslationToggle().disabled).toBe(false);
  });

  it('shows masked key and configurable model fields for OpenAI', async () => {
    state.translationProvider = 'openai';

    render(<LangPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    const keyInput = await screen.findByLabelText('OpenAI API Key');
    expect(keyInput.getAttribute('type')).toBe('password');
    expect((keyInput as HTMLInputElement).value).toBe('sk-test');
    expect((screen.getByLabelText('OpenAI Model') as HTMLInputElement).value).toBe('gpt-5.6-luna');
  });
});
