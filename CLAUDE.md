@AGENTS.md

# Chatbot Accelerator

## Purpose

Production-ready streaming chatbot template using Anthropic SDK and Next.js 16. Designed as an accelerator — fork and extend for any Claude-powered chat application.

## Capabilities

- Real-time streaming responses via SSE (Server-Sent Events)
- Multi-model selection: Opus 4.7, Sonnet 4.6, Haiku 4.5 — swappable mid-conversation
- Configurable temperature (0.0–1.0) via slider
- Persistent conversation history (in-memory per session)
- Slash commands: `/cost`, `/model <name>`, `/engine <name>`, `/fetchpage <url>`, `/system <prompt>`, `/research <topic>`
- Automatic retry on rate limit (HTTP 429 and 529) with exponential backoff + jitter (max 3 retries)
- Token usage tracking and per-model cost estimation
- Web search via Brave or Tavily (`web_search` tool)
- URL fetching with HTML stripping (`read_url` tool)
- Safe sandboxed calculator — no `eval` (`calculate` tool)
- Persistent notes across turns, stored in `data/notes.json` (`save_note` / `read_notes` tools)
- Deep research pipeline: Haiku query gen → search → fetch → Sonnet synthesis (`/research`)
- GitHub-flavored markdown rendering in assistant messages (react-markdown + remark-gfm)
- Syntax-highlighted code blocks with one-click copy (react-syntax-highlighter, Prism oneDark)

## Slash Commands

| Command | Effect |
|---|---|
| `/cost` | Toggle cost panel showing token counts and estimated USD per model |
| `/model <opus\|sonnet\|haiku>` | Swap active model mid-conversation |
| `/engine <none\|brave\|tavily>` | Switch web search engine |
| `/fetchpage <url>` | Fetch a URL and pass its text content to Claude |
| `/system <prompt>` | Update the system prompt immediately |
| `/research <topic>` | Run 4-step deep research pipeline and get a synthesized report |

## Tools & Justification

| Tool | Version | Justification |
|---|---|---|
| Next.js (App Router) | 16.2.4 | File-based routing, Route Handlers for streaming API, Turbopack by default |
| @anthropic-ai/sdk | 0.91.x | Official Anthropic client — native async streaming via `messages.stream()` |
| shadcn/ui | CLI v4 | Unstyled, accessible component primitives — copy-owned code, zero runtime overhead |
| Tailwind CSS | 4.x | Utility-first CSS; ships with Next.js 16 default template |
| react-markdown | 10.x | Renders GitHub-flavored markdown in assistant messages |
| remark-gfm | 4.x | Adds GFM extensions (tables, strikethrough, task lists) to react-markdown |
| react-syntax-highlighter | 16.x | Prism-based syntax highlighting for fenced code blocks |
| lucide-react | 1.x | Icon set used by shadcn components and copy button |
| sonner | 2.x | Toast notifications for errors, retries, and command feedback |
| pnpm | 10.x | Fast, disk-efficient package manager |
| TypeScript | 5.x | Type safety across SDK payloads, message state, and command parsing |

## Architecture Overview

```
app/api/chat/route.ts      ← POST Route Handler; streams SSE events
app/api/research/route.ts  ← POST Route Handler; runs 4-step research pipeline
hooks/use-chat.ts          ← Main React state (messages, model, temp, usage)
hooks/use-research.ts      ← Research pipeline state and streaming
hooks/use-stream-reader.ts ← Reads ReadableStream, dispatches SSE events to use-chat
lib/types.ts               ← Shared TypeScript types
lib/cost.ts                ← Pricing table + cost calculation helpers
lib/commands.ts            ← /command parser
lib/models.ts              ← Model ID constants
lib/web-search.ts          ← web_search tool definition + Brave/Tavily execution
lib/fetch-page.ts          ← read_url tool definition + URL fetch + HTML stripping
lib/calculator.ts          ← calculate tool definition + safe math parser (no eval)
lib/note-store.ts          ← save_note/read_notes tools + file-based persistence (data/notes.json)
lib/search-engines.ts      ← Engine labels
components/chat/           ← Chat UI (container, messages, input, bubbles)
components/controls/       ← Model selector, temperature slider, system prompt dialog, cost panel
```

**Flow:** `ChatInput` parses input → if slash command, handles client-side; otherwise calls `sendMessage` in `use-chat` → fetches `/api/chat` → route handler streams SSE → `use-stream-reader` reads tokens and usage events → `use-chat` appends tokens to active message and accumulates usage.

**Research flow:** `/research <topic>` → `useResearch` → `POST /api/research` → Haiku generates queries → web search → URL fetch → Sonnet synthesis → SSE stream to client.

**Retry flow:** On 429/529, route handler sleeps with exponential backoff and sends a `retry` SSE event. Client shows a toast: "Rate limited. Retry N/3 in Xs…"

## Setup

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
pnpm dev
```
