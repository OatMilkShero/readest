import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isTauriAppPlatform } from '@/services/environment';
import { clearSecureItem, getSecureItem, setSecureItem } from '@/utils/bridge';

vi.mock('@/services/environment', () => ({
  isTauriAppPlatform: vi.fn(),
}));

vi.mock('@/utils/bridge', () => ({
  clearSecureItem: vi.fn(),
  getSecureItem: vi.fn(),
  setSecureItem: vi.fn(),
}));

describe('OpenAI translation credential storage', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    vi.mocked(isTauriAppPlatform).mockReset().mockReturnValue(false);
    vi.mocked(getSecureItem).mockReset();
    vi.mocked(setSecureItem).mockReset();
    vi.mocked(clearSecureItem).mockReset();
  });

  it('keeps the web API key in session storage rather than persistent settings', async () => {
    const { getOpenAITranslationAPIKey, saveOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    await saveOpenAITranslationAPIKey('  sk-browser  ');

    expect(await getOpenAITranslationAPIKey()).toBe('sk-browser');
    expect(sessionStorage.getItem('readest-openai-translation-api-key')).toBe('sk-browser');
    expect(setSecureItem).not.toHaveBeenCalled();
  });

  it('uses the native secure-item bridge in Tauri builds', async () => {
    vi.mocked(isTauriAppPlatform).mockReturnValue(true);
    vi.mocked(setSecureItem).mockResolvedValue({ success: true });
    vi.mocked(getSecureItem).mockResolvedValue({ value: 'sk-native' });
    const { getOpenAITranslationAPIKey, saveOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    await saveOpenAITranslationAPIKey('sk-native');

    expect(setSecureItem).toHaveBeenCalledWith({
      key: 'openai-translation-api-key',
      value: 'sk-native',
    });
    expect(await getOpenAITranslationAPIKey()).toBe('sk-native');
    expect(sessionStorage.length).toBe(0);
  });

  it('clears the native secure item when the key is emptied', async () => {
    vi.mocked(isTauriAppPlatform).mockReturnValue(true);
    vi.mocked(clearSecureItem).mockResolvedValue({ success: true });
    const { saveOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    await saveOpenAITranslationAPIKey('   ');

    expect(clearSecureItem).toHaveBeenCalledWith({ key: 'openai-translation-api-key' });
  });
});
