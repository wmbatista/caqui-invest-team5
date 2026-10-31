# Quickstart

```bash
cp .env.example .env
npm install
npm run dev
curl -X POST http://localhost:3000/api/v1/chat \
  -H 'content-type: application/json' \
  -d '{"message":"O que é liquidez diária?"}'
```

Use `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, preencha `OPENROUTER_API_KEY` e escolha
em `LLM_MODEL` um modelo habilitado no OpenRouter.
