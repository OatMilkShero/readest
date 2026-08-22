import { isTauriAppPlatform } from '@/services/environment';
import { useSettingsStore } from '@/store/settingsStore';
import { clearSecureItem, getSecureItem, setSecureItem } from '@/utils/bridge';

export const DEFAULT_OPENAI_TRANSLATION_MODEL = 'gpt-5.6-luna';

const SECURE_ITEM_KEY = 'openai-translation-api-key';
const SESSION_STORAGE_KEY = 'readest-openai-translation-api-key';

let memoryAPIKey: string | null | undefined;
let apiKeyReadInFlight: Promise<string | null> | null = null;

export const getOpenAITranslationModel = (): string => {
  const configured =
    useSettingsStore.getState().settings?.globalReadSettings?.openAITranslationModel;
  return configured?.trim() || DEFAULT_OPENAI_TRANSLATION_MODEL;
};

/**
 * Native builds persist the key in the existing OS-backed secure-item store.
 * A web page cannot offer equivalent secret storage, so web builds keep it in
 * sessionStorage only: it survives a refresh but is neither synced nor written
 * to Readest's persistent settings file.
 */
export const getOpenAITranslationAPIKey = async (): Promise<string | null> => {
  if (memoryAPIKey !== undefined) return memoryAPIKey;

  if (isTauriAppPlatform()) {
    if (!apiKeyReadInFlight) {
      apiKeyReadInFlight = (async () => {
        const response = await getSecureItem({ key: SECURE_ITEM_KEY });
        if (response.error) {
          throw new Error(`Could not read OpenAI API key: ${response.error}`);
        }
        if (memoryAPIKey === undefined) {
          memoryAPIKey = response.value?.trim() || null;
        }
        return memoryAPIKey;
      })().finally(() => {
        apiKeyReadInFlight = null;
      });
    }
    return apiKeyReadInFlight;
  }

  memoryAPIKey = globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY)?.trim() || null;
  return memoryAPIKey;
};

export const saveOpenAITranslationAPIKey = async (apiKey: string): Promise<void> => {
  const value = apiKey.trim();

  if (isTauriAppPlatform()) {
    const response = value
      ? await setSecureItem({ key: SECURE_ITEM_KEY, value })
      : await clearSecureItem({ key: SECURE_ITEM_KEY });
    if (!response.success) {
      throw new Error(`Could not save OpenAI API key: ${response.error ?? 'secure storage error'}`);
    }
  } else if (value) {
    globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, value);
  } else {
    globalThis.sessionStorage?.removeItem(SESSION_STORAGE_KEY);
  }

  memoryAPIKey = value || null;
};
