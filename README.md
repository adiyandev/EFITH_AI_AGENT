# EFITH AI Agent

EFITH is a local-first AI assistant built with React, Vite, TypeScript, Fastify, and multiple AI provider integrations.

It supports:

- OpenAI
- Google Gemini
- Anthropic Claude
- Provider/model selection
- Local API-key configuration through Settings
- Connection testing
- A Fastify backend
- A React/Vite frontend
- GitHub Pages frontend deployment support

## Requirements

Install these before starting:

- Node.js 20 or newer
- npm
- Git

Check your versions:

```bash
node --version
npm --version
git --version
```

## 1. Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/adiyandev/EFITH_AI_AGENT.git
cd EFITH_AI_AGENT
```

## 2. Install dependencies

Install the project dependencies:

```bash
npm install
```

## 3. Start EFITH locally

EFITH has two parts:

- Frontend: Vite
- Backend: Fastify API

You need to run both.

### Terminal 1 — backend

```bash
npm run server:dev
```

The backend runs on:

```
http://localhost:8787
```

You can check it at:

```
http://localhost:8787/api/health
```

### Terminal 2 — frontend

Open another terminal in the same project folder:

```bash
npm run dev
```

Vite will print the local frontend URL, normally:

```
http://localhost:5173
```

Open that URL in your browser.

## 4. Configure your AI provider

You do **not** need to put your API keys in the repository.

Open EFITH and go to:

```
Settings
  → AI provider
  → Model
  → API key
  → Test connection
  → Save settings
```

Choose one:

### OpenAI

Select **OpenAI**, choose a model, paste your OpenAI API key, then press **Test connection**.

### Google Gemini

Select **Google Gemini**, choose a Gemini model, paste your Gemini API key, then press **Test connection**.

### Anthropic

Select **Anthropic Claude**, choose a Claude model, paste your Anthropic API key, then press **Test connection**.

After the connection succeeds, press **Save settings**.

## 5. How API keys work in local mode

EFITH is designed so that the API key is entered through the local Settings UI.

The flow is:

```
Browser
   │
   │ API key
   ▼
Local EFITH backend
   │
   ├── OpenAI
   ├── Gemini
   └── Anthropic
```

The browser stores your local EFITH settings so you do not have to enter the key every time.

The key is **not committed to GitHub**.

Never put a real API key inside:

- React source files
- `.env.example`
- GitHub commits
- public GitHub Pages files
- screenshots
- README files

## 6. Optional: backend environment variables

You can also configure a provider directly on the local backend with a `.env` file.

Create:

```
.env
```

Example:

```env
PORT=8787
HOST=0.0.0.0

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5-5
```

You only need to fill in the providers you use.

Example:

```env
GEMINI_API_KEY=your_real_key_here
```

The `.gitignore` file prevents `.env` from being committed.

## 7. API endpoints

The local Fastify backend provides:

### Health

```
GET /api/health
```

Shows whether the backend is running and which environment-configured providers are available.

### Providers

```
GET /api/providers
```

Returns provider configuration status.

### Test provider

```
POST /api/providers/test
```

Tests an API key against the selected provider/model.

### Chat

```
POST /api/chat
```

Sends the conversation to the selected provider and returns the assistant response.

## 8. Project structure

```
EFITH_AI_AGENT/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── 404.html
├── server/
│   └── index.ts
├── src/
│   ├── components/
│   │   ├── chat/
│   │   ├── layout/
│   │   └── settings/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── render.yaml
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

## 9. Build the frontend

To create a production build:

```bash
npm run build
```

The compiled frontend is written to:

```
dist/
```

Preview the production frontend locally:

```bash
npm run preview
```

## 10. Git workflow

After making changes:

```bash
git status
git add .
git commit -m "describe your changes"
git push origin main
```

For example:

```bash
git add .
git commit -m "feat: improve provider settings"
git push origin main
```

## 11. GitHub Pages

The frontend is configured for the repository:

```
https://github.com/adiyandev/EFITH_AI_AGENT
```

GitHub Actions builds and deploys the Vite frontend when changes are pushed to `main`.

Important: **GitHub Pages only hosts the frontend.**

The Fastify backend must still run locally for the current local-first setup.

If the frontend is opened from GitHub Pages, set the Backend URL in EFITH Settings to the address of a reachable backend.

For a completely local setup, leave the Backend URL empty and run the backend on:

```
http://localhost:8787
```

## 12. Troubleshooting

### Backend does not start

Run:

```bash
npm install
npm run server:dev
```

Make sure port `8787` is not already being used.

### Frontend cannot reach the backend

Make sure both terminals are running:

```bash
npm run server:dev
```

and:

```bash
npm run dev
```

Then check:

```
http://localhost:8787/api/health
```

### Provider says API key is missing

Open:

```
Settings → API provider → API key
```

Enter the key and use **Test connection**.

### Connection test fails

Check:

1. The API key is correct.
2. The selected model is available to your provider/account.
3. Your computer has an internet connection.
4. The Fastify backend is running.
5. You selected the correct provider.

### Settings seem corrupted

EFITH stores local settings under:

```
efith.settings
```

in browser local storage.

Clearing that entry resets the local settings.

## 13. Security

EFITH is currently intended as a **local application**.

For local use:

- Keep API keys private.
- Do not commit `.env`.
- Do not paste keys into source code.
- Do not publish API keys in GitHub Pages.
- Do not share screenshots containing API keys.
- Rotate a key immediately if it is accidentally exposed.

The Settings UI is convenient for local development, but it should not be treated as a secure multi-user credential vault.

## 14. Development commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite frontend |
| `npm run server` | Start Fastify backend |
| `npm run server:dev` | Start backend with file watching |
| `npm run build` | Build frontend |
| `npm run preview` | Preview production frontend |

## Quick start

If everything is already installed:

```bash
git clone https://github.com/adiyandev/EFITH_AI_AGENT.git
cd EFITH_AI_AGENT
npm install
```

Terminal 1:

```bash
npm run server:dev
```

Terminal 2:

```bash
npm run dev
```

Then open the Vite URL, go to **Settings**, choose your provider, enter your API key, test the connection, save, and start chatting.

---

Built for EFITH — a local-first AI assistant.
