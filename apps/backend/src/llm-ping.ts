import { loadConfig } from './config.js';
import { OpenRouterProvider } from './providers/openrouter.js';

const config = loadConfig();
if (!config.apiKey) throw new Error('Defina OPENROUTER_API_KEY no ambiente para executar o ping.');
const provider = new OpenRouterProvider(config);
const response = await provider.complete({
  system: 'Responda de forma curta.',
  messages: [{ role: 'user', content: 'Responda apenas: ok' }],
  maxTokens: 10,
});
console.log(response);
