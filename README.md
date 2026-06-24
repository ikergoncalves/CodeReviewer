# Code Reviewer

> AI-powered code review with real-time streaming, line-by-line issue
> detection, and severity badges — built with React, TypeScript, and Claude API.

![CI](https://github.com/ikergoncalves/CodeReviewer/actions/workflows/ci.yml/badge.svg)
[![Vercel](https://img.shields.io/badge/deploy-vercel-black)](https://code-reviewer.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Live Demo](https://code-reviewer.vercel.app) · [Report Bug](https://github.com/ikergoncalves/CodeReviewer/issues)

---

## Demo

> Record a short demo GIF with [LICEcap](https://www.cockos.com/licecap/) or
> [Kap](https://getkap.co/) and replace this placeholder.

![Demo](demo.gif)

---

## Features

- **Real-time streaming** — Issues appear line by line as Claude analyzes the code
- **Line-by-line highlighting** — Click any issue to jump to the exact line in the editor
- **Severity badges** — Errors, warnings, and info classified and color-coded
- **7 languages** — JavaScript, TypeScript, Python, Go, Rust, Java, C++
- **Copy report** — Export the full review as Markdown in one click
- **Keyboard shortcuts** — `Cmd/Ctrl+Enter` to analyze, `Escape` to stop
- **Zero persistence** — No database, no auth, no data stored

---

## Tech Stack

| Technology | Why |
|---|---|
| React 18 + Vite | Fast DX, instant HMR, optimized production build |
| TypeScript strict | Zero implicit `any`, `noUncheckedIndexedAccess`, catches whole classes of bugs |
| Tailwind CSS + shadcn/ui | Utility-first with accessible primitives |
| CodeMirror 6 | Extensible editor with syntax highlight and custom line decorations |
| Anthropic SDK | Official streaming client for Claude API |
| Vercel Serverless | Serverless Function protects the API key — never exposed to the browser |
| Vitest + Testing Library | Fast unit tests co-located with source |
| GitHub Actions | CI on every push: lint, type-check, test |

---

## Architecture

```
Browser → Vercel Serverless Function → Anthropic API
  ↑          (api/review.ts)
  └── SSE stream ──────────────────────────────┘
```

The browser never touches the Anthropic API directly. The Serverless Function:

1. Validates and rate-limits the request
2. Opens a streaming connection to Claude
3. Proxies chunks as Server-Sent Events back to the browser

The frontend reads the SSE stream and progressively parses partial JSON as it
arrives — issues render in real time before the response is complete.

---

## Design Decisions

**Why SSE instead of WebSocket?**
SSE is unidirectional (server → client), which is exactly what streaming
inference needs. It works over standard HTTP, requires no handshake, and is
natively supported by `fetch` + `ReadableStream` without extra libraries.
WebSockets add bidirectional complexity that this use case doesn't need.

**Why a Vercel Serverless Function instead of calling the API from the browser?**
The Anthropic API key must never be exposed in client-side code. The Edge
Function acts as an authenticated proxy and adds rate limiting, so the key
stays server-side.

**Why CodeMirror instead of Monaco?**
CodeMirror 6 is modular and tree-shakeable — you pay only for the language
extensions you import. Monaco bundles the full VS Code language server, which
would add ~5 MB to the bundle. CodeMirror is also lazy-loaded here, so it
doesn't block the initial paint.

**Why progressive JSON parsing?**
Claude streams the issues array as plain text. Rather than waiting for the
complete response, `parsePartial()` tries to extract valid `{...}` objects
from the partial stream, so users see issues as they're generated. The
fallback regex (`/\{[^}]+\}/g`) recovers complete objects even when the
enclosing array isn't closed yet.

---

## Local Development

**Prerequisites:** Node 20+, an [Anthropic API key](https://console.anthropic.com)

```bash
git clone https://github.com/ikergoncalves/CodeReviewer.git
cd CodeReviewer
npm install
cp .env.example .env          # add your ANTHROPIC_API_KEY
npm run dev
```

The Vercel CLI is not required for local development — Vite proxies `/api/*`
requests automatically when you run `npm run dev`.

> **Note:** To test the API Function locally, install the
> [Vercel CLI](https://vercel.com/docs/cli) and run `vercel dev` instead.

---

## Testing

```bash
npm run test              # run all tests
npm run test -- --coverage  # with coverage report
npm run type-check        # TypeScript strict check
npm run lint              # ESLint (zero warnings)
```

---

## Deployment

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `FRONTEND_URL` — your Vercel deployment URL (e.g. `https://code-reviewer.vercel.app`)
4. Deploy

---

## What I'd Add with More Time

- **Review history** — persist past reviews in localStorage or a lightweight DB
- **Diff view** — show a before/after diff for each refactoring suggestion
- **Multi-file support** — review multiple files in a single session
- **Shareable links** — encode the code + review result in a URL

---

## License

MIT © [Iker Gonçalves](https://github.com/ikergoncalves)
