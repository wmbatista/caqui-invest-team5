# Quickstart

```bash
cp .env.example .env
npm install
npm run dev
curl -X POST http://localhost:3000/perguntar \
  -H 'content-type: application/json' \
  -d '{"id_cliente":"C-0001","pergunta":"Quanto eu tenho aplicado?"}'
```

Use `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, preencha `OPENROUTER_API_KEY` e escolha
em `LLM_MODEL` um modelo habilitado no OpenRouter.

Sem chave, o endpoint continua funcionando com o template determinístico. Para testar a conexão:

```bash
npm run llm:ping
```
