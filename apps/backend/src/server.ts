import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { NullProvider, OpenRouterProvider } from './providers/openrouter.js';

const config = loadConfig();
const provider = config.llmEnabled && config.apiKey
  ? new OpenRouterProvider(config)
  : new NullProvider();
const app = await buildApp(config, provider);
await app.listen({ port: config.port, host: config.host });
