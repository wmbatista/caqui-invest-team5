import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('configuration', () => {
  it('loads the typed OpenRouter and MVP defaults', () => {
    const config = loadConfig({ OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1/', LLM_MODEL: 'openai/gpt-4o-mini' });
    expect(config).toMatchObject({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-4o-mini',
      dataDir: '../../dados',
      effort: 'low',
      llmEnabled: true,
      clockDefault: '2026-11-18T10:00:00-03:00',
    });
  });
});
