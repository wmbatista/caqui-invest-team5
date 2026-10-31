import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATA_DIR: z.string().default('../../dados'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().min(1).default('openai/gpt-4o-mini'),
  LLM_EFFORT: z.enum(['low', 'medium', 'high']).default('low'),
  LLM_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(100).max(120000).default(20000),
  CLOCK_DEFAULT: z.string().datetime({ offset: true }).default('2026-11-18T10:00:00-03:00'),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const env = envSchema.parse(source);
  return {
    port: env.PORT,
    host: env.HOST,
    corsOrigins: env.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean),
    dataDir: env.DATA_DIR,
    provider: 'openrouter',
    baseUrl: env.OPENROUTER_BASE_URL.replace(/\/$/, ''),
    apiKey: env.OPENROUTER_API_KEY,
    model: env.LLM_MODEL,
    effort: env.LLM_EFFORT,
    llmEnabled: env.LLM_ENABLED,
    timeoutMs: env.LLM_TIMEOUT_MS,
    clockDefault: env.CLOCK_DEFAULT,
  };
}
