import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();
const mockGetAPIKey = vi.fn();
const mockGetModel = vi.fn();

vi.mock('@/services/ai/utils/httpFetch', () => ({
  getAIFetch: () => mockFetch,
}));

vi.mock('@/services/translators/providers/openaiConfig', () => ({
  DEFAULT_OPENAI_TRANSLATION_MODEL: 'gpt-5.6-luna',
  getOpenAITranslationAPIKey: mockGetAPIKey,
  getOpenAITranslationModel: mockGetModel,
}));

vi.mock('@/utils/misc', () => ({
  stubTranslation: (text: string) => text,
}));

vi.mock('@/utils/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
  },
}));

const response = (translations: Array<{ index: number; text: string }>) => ({
  ok: true,
  status: 200,
  json: async () => ({
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify({ translations }) }],
      },
    ],
  }),
});

describe('openaiProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    mockGetAPIKey.mockReset().mockResolvedValue('sk-test-secret');
    mockGetModel.mockReset().mockReturnValue('gpt-5.6-luna');
  });

  it('is registered as a normal translator without claiming markup support', async () => {
    const { openaiProvider } = await import('@/services/translators/providers/openai');
    const { getTranslators } = await import('@/services/translators/providers');

    expect(openaiProvider).toMatchObject({ name: 'openai', label: 'OpenAI' });
    expect(openaiProvider.preservesMarkup).toBeUndefined();
    expect(getTranslators().map((provider) => provider.name)).toContain('openai');
  });

  it('preserves empty and whitespace-only segments while mapping structured results by index', async () => {
    mockFetch.mockResolvedValue(
      response([
        { index: 0, text: '你好' },
        { index: 2, text: '世界' },
      ]),
    );
    const { openaiProvider } = await import('@/services/translators/providers/openai');

    const result = await openaiProvider.translate(['Hello', '  ', 'World'], 'en', 'zh-Hans');

    expect(result).toEqual(['你好', '  ', '世界']);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('gpt-5.6-luna');
    expect(body.store).toBe(false);
    expect(body.input[0].role).toBe('developer');
    expect(body.input[0].content).toContain('Return only the translation');
    expect(body.input[0].content).toContain('Do not add explanations');
    expect(body.input[1].content).toContain('"index":0');
    expect(body.input[1].content).toContain('"index":2');
    expect(body.text.format).toMatchObject({
      type: 'json_schema',
      name: 'translation_batch',
      strict: true,
    });
    expect(body.text.format.schema.properties.translations.minItems).toBe(2);
    expect(body.text.format.schema.properties.translations.maxItems).toBe(2);
    expect(init?.headers).toEqual({
      Authorization: 'Bearer sk-test-secret',
      'Content-Type': 'application/json',
    });
  });

  it('uses the configured model and includes it in the cache namespace', async () => {
    mockGetModel.mockReturnValue('gpt-5.6-terra');
    mockFetch.mockResolvedValue(response([{ index: 0, text: 'Bonjour' }]));
    const { openaiProvider } = await import('@/services/translators/providers/openai');

    await openaiProvider.translate(['Hello'], 'en', 'fr');

    expect(openaiProvider.getCacheNamespace?.()).toBe('openai:gpt-5.6-terra');
    const body = JSON.parse(String(mockFetch.mock.calls[0]![1]?.body));
    expect(body.model).toBe('gpt-5.6-terra');
  });

  it('does not call the API when every segment is blank', async () => {
    const { openaiProvider } = await import('@/services/translators/providers/openai');
    await expect(openaiProvider.translate(['', '\n'], 'AUTO', 'fr')).resolves.toEqual(['', '\n']);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockGetAPIKey).not.toHaveBeenCalled();
  });

  it('requires a configured API key', async () => {
    mockGetAPIKey.mockResolvedValue(null);
    const { openaiProvider } = await import('@/services/translators/providers/openai');

    await expect(openaiProvider.translate(['Hello'], 'en', 'fr')).rejects.toThrow(
      'OpenAI API key is not configured',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([401, 429, 500])('reports API status %s without including the key', async (status) => {
    mockFetch.mockResolvedValue({ ok: false, status });
    const { openaiProvider } = await import('@/services/translators/providers/openai');

    const error = await openaiProvider.translate(['Hello'], 'en', 'fr').catch((reason) => reason);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(String(status));
    expect((error as Error).message).not.toContain('sk-test-secret');
  });

  it('rejects malformed or incomplete structured output', async () => {
    mockFetch.mockResolvedValue(response([{ index: 1, text: 'Bonjour' }]));
    const { openaiProvider } = await import('@/services/translators/providers/openai');

    await expect(openaiProvider.translate(['Hello'], 'en', 'fr')).rejects.toThrow(
      'malformed response',
    );
  });

  it('passes an AbortSignal to the transport', async () => {
    mockFetch.mockResolvedValue(response([{ index: 0, text: 'Bonjour' }]));
    const controller = new AbortController();
    const { openaiProvider } = await import('@/services/translators/providers/openai');

    await openaiProvider.translate(['Hello'], 'en', 'fr', null, false, controller.signal);

    expect(mockFetch.mock.calls[0]![1]?.signal).toBe(controller.signal);
  });
});
