import { getAIFetch } from '@/services/ai/utils/httpFetch';
import { stubTranslation as _ } from '@/utils/misc';
import { TranslationProvider } from '../types';
import { getOpenAITranslationAPIKey, getOpenAITranslationModel } from './openaiConfig';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const TRANSLATION_INSTRUCTIONS = `Translate the source text faithfully into the requested target language.

Rules:
- Do not add information that is not explicitly present in the source.
- Do not add explanations, interpretations, implications, or commentary.
- Do not omit information or summarize.
- Do not improve, rewrite, or editorialize the author's argument.
- Preserve ambiguity when the source itself is ambiguous.
- Preserve names, numbers, dates, citations, terminology, and factual details.
- Preserve each input segment as exactly one output segment with the same index.
- Prefer semantic fidelity over stylistic embellishment.
- If something is genuinely ambiguous, translate conservatively rather than guessing.
- Return only the translation in the required structured format.`;

interface IndexedText {
  index: number;
  text: string;
}

const isIndexedText = (value: unknown): value is IndexedText => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return Number.isInteger(candidate['index']) && typeof candidate['text'] === 'string';
};

const getOutputText = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const output = (data as Record<string, unknown>)['output'];
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>)['content'];
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const record = part as Record<string, unknown>;
      if (record['type'] === 'output_text' && typeof record['text'] === 'string') {
        return record['text'];
      }
    }
  }
  return null;
};

const parseTranslations = (data: unknown, expectedIndices: number[]): IndexedText[] => {
  const outputText = getOutputText(data);
  if (!outputText) throw new Error('OpenAI translation failed: malformed response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error('OpenAI translation failed: malformed response');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('OpenAI translation failed: malformed response');
  }
  const translations = (parsed as Record<string, unknown>)['translations'];
  if (!Array.isArray(translations) || !translations.every(isIndexedText)) {
    throw new Error('OpenAI translation failed: malformed response');
  }
  if (
    translations.length !== expectedIndices.length ||
    translations.some((translation, index) => translation.index !== expectedIndices[index])
  ) {
    throw new Error('OpenAI translation failed: malformed response');
  }
  return translations;
};

export const openaiProvider: TranslationProvider = {
  name: 'openai',
  label: _('OpenAI'),
  // Intentionally no `preservesMarkup`: this integration has not been
  // verified against live inline HTML, so Readest sends plain text.
  getCacheNamespace: () => `openai:${getOpenAITranslationModel()}`,
  translate: async (
    texts: string[],
    sourceLang: string,
    targetLang: string,
    _token?: string | null,
    _useCache?: boolean,
    signal?: AbortSignal,
  ): Promise<string[]> => {
    if (!texts.length) return [];

    const segments = texts
      .map((text, index) => ({ index, text }))
      .filter(({ text }) => text.trim().length > 0);
    if (!segments.length) return [...texts];

    signal?.throwIfAborted();
    const apiKey = await getOpenAITranslationAPIKey();
    if (!apiKey) throw new Error('OpenAI API key is not configured');

    const format = {
      type: 'json_schema',
      name: 'translation_batch',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          translations: {
            type: 'array',
            minItems: segments.length,
            maxItems: segments.length,
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer', minimum: 0 },
                text: { type: 'string' },
              },
              required: ['index', 'text'],
              additionalProperties: false,
            },
          },
        },
        required: ['translations'],
        additionalProperties: false,
      },
    };

    const response = await getAIFetch()(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getOpenAITranslationModel(),
        store: false,
        input: [
          { role: 'developer', content: TRANSLATION_INSTRUCTIONS },
          {
            role: 'user',
            content: JSON.stringify({
              sourceLanguage: sourceLang,
              targetLanguage: targetLang,
              segments,
            }),
          },
        ],
        text: { format },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI translation failed with status ${response.status}`);
    }

    const data: unknown = await response.json().catch(() => null);
    const translated = parseTranslations(
      data,
      segments.map(({ index }) => index),
    );
    const results = [...texts];
    translated.forEach(({ index, text }) => {
      results[index] = text;
    });
    return results;
  },
};
