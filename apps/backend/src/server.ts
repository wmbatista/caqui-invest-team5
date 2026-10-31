import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { OpenRouterProvider } from './providers/openrouter.js';

const config = loadConfig();
const app = await buildApp(config, new OpenRouterProvider(config));
await app.listen({ port: config.port, host: config.host });
