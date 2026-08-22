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

  it('shares one in-flight native read across concurrent callers and caches the result', async () => {
    vi.mocked(isTauriAppPlatform).mockReturnValue(true);
    let resolveRead: ((response: { value: string }) => void) | undefined;
    vi.mocked(getSecureItem).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    const { getOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    const reads = Array.from({ length: 5 }, () => getOpenAITranslationAPIKey());

    expect(getSecureItem).toHaveBeenCalledTimes(1);
    resolveRead?.({ value: '  sk-shared  ' });
    await expect(Promise.all(reads)).resolves.toEqual(Array(5).fill('sk-shared'));
    await expect(getOpenAITranslationAPIKey()).resolves.toBe('sk-shared');
    expect(getSecureItem).toHaveBeenCalledTimes(1);
  });

  it('clears a failed in-flight read and retries without caching the Keychain error as missing', async () => {
    vi.mocked(isTauriAppPlatform).mockReturnValue(true);
    vi.mocked(getSecureItem)
      .mockResolvedValueOnce({ error: 'User denied Keychain access' })
      .mockResolvedValueOnce({ value: 'sk-after-retry' });
    const { getOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    await expect(getOpenAITranslationAPIKey()).rejects.toThrow('User denied Keychain access');
    await expect(getOpenAITranslationAPIKey()).resolves.toBe('sk-after-retry');
    expect(getSecureItem).toHaveBeenCalledTimes(2);
  });

  it('caches a genuinely missing native key without repeating the Keychain read', async () => {
    vi.mocked(isTauriAppPlatform).mockReturnValue(true);
    vi.mocked(getSecureItem).mockResolvedValue({});
    const { getOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    await expect(getOpenAITranslationAPIKey()).resolves.toBeNull();
    await expect(getOpenAITranslationAPIKey()).resolves.toBeNull();
    expect(getSecureItem).toHaveBeenCalledTimes(1);
  });

  it('does not let a failed in-flight read overwrite a key saved concurrently', async () => {
    vi.mocked(isTauriAppPlatform).mockReturnValue(true);
    vi.mocked(setSecureItem).mockResolvedValue({ success: true });
    let resolveRead: ((response: { error: string }) => void) | undefined;
    vi.mocked(getSecureItem).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    const { getOpenAITranslationAPIKey, saveOpenAITranslationAPIKey } = await import(
      '@/services/translators/providers/openaiConfig'
    );

    const read = getOpenAITranslationAPIKey();
    await saveOpenAITranslationAPIKey('sk-saved');
    resolveRead?.({ error: 'late denial' });

    await expect(read).rejects.toThrow('late denial');
    await expect(getOpenAITranslationAPIKey()).resolves.toBe('sk-saved');
    expect(getSecureItem).toHaveBeenCalledTimes(1);
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
