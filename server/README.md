# EFITH backend

The backend is a small Fastify API that keeps provider API keys off the browser.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `EFITH_API_KEY` to your provider key.
3. Set `EFITH_MODEL` if you want a different model.
4. Run `npm run server:dev`.

Health check:

`GET http://localhost:8787/api/health`

Chat:

`POST http://localhost:8787/api/chat`

The backend currently speaks the OpenAI-compatible Chat Completions format, so it can be pointed at OpenAI or another compatible provider by changing `EFITH_API_BASE_URL`.
