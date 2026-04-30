# Chatbot Accelerator

Production-ready streaming chatbot template built on Next.js 16 and the Anthropic SDK. Fork and extend for any Claude-powered chat application.

## Quick Start

```bash
cp .env.local.example .env.local
# Add ANTHROPIC_API_KEY to .env.local
pnpm install
pnpm dev
```

## Features

### Streaming Responses
Real-time token streaming via Server-Sent Events (SSE). Tokens appear as Claude generates them — no waiting for full response.

### Multi-Model Selection
Switch between Opus, Sonnet, and Haiku at any time, including mid-conversation. Each name maps to a fixed model version — use `/model` to swap.

### Chat Memory
Conversation history persists in-memory for the session. Every message sent includes full prior context, giving Claude continuity across turns.

### Temperature Control
Slider (0.0–1.0) adjusts response creativity. Configurable per session without a page reload.

### Token Usage & Cost Tracking
Every response accumulates input/output token counts. Cost panel shows estimated USD per model based on current pricing.

### Automatic Retry with Backoff
On HTTP 429 (rate limit) or 529, the route handler retries up to 3 times using exponential backoff with jitter. A toast notification shows: `"Rate limited. Retry N/3 in Xs…"` A failed third retry surfaces an error toast.

### Web Search
Claude can search the web via Brave or Tavily when a search engine is configured. Set one with `/engine <brave|tavily>`. Requires `BRAVE_API_KEY` or `TAVILY_API_KEY` in `.env.local`.

### URL Fetching
Claude can fetch and read any URL using the `read_url` tool, triggered via `/fetchpage <url>` or automatically when context requires it. HTML is stripped to plain text before being sent to the model.

### Calculator
Claude uses a safe sandboxed math parser (no `eval`) for arithmetic. Supports `+`, `-`, `*`, `/`, `**` (power), `//` (square root prefix), and parentheses.

### Notes
Claude can persist notes across turns using `save_note` and `read_notes` tools. Notes are written to `data/notes.json` and survive page reloads.

### Deep Research
`/research <topic>` runs a 4-step autonomous pipeline: Haiku generates search queries → searches the web → fetches top results → Sonnet synthesizes a structured report. Requires a search engine to be configured.

### Markdown Rendering
Assistant messages render full GitHub-flavored markdown: headings, bold/italic, lists, blockquotes, tables, inline code, links, and horizontal rules — all with consistent Tailwind styling.

### Syntax Highlighting
Fenced code blocks in assistant messages are highlighted via Prism (`oneDark` theme) with language detection from the opening fence. Includes a one-click copy button that confirms with a checkmark icon.

## Slash Commands

Type these directly in the chat input:

| Command | Effect |
|---|---|
| `/cost` | Toggle cost panel (token counts + estimated USD per model) |
| `/model <opus\|sonnet\|haiku>` | Swap active model mid-conversation |
| `/engine <none\|brave\|tavily>` | Switch web search engine |
| `/fetchpage <url>` | Fetch a URL and pass its text content to Claude |
| `/system <prompt>` | Update the system prompt immediately |
| `/research <topic>` | Run 4-step deep research pipeline and get a synthesized report |

## Architecture

```
app/api/chat/route.ts      ← POST Route Handler; streams SSE events
app/api/research/route.ts  ← POST Route Handler; runs 4-step research pipeline
hooks/use-chat.ts          ← Message state, model, temperature, usage
hooks/use-research.ts      ← Research pipeline state and streaming
hooks/use-stream-reader.ts ← Reads ReadableStream, dispatches SSE events
lib/types.ts               ← Shared TypeScript types
lib/cost.ts                ← Pricing table + cost calculation
lib/commands.ts            ← Slash command parser
lib/models.ts              ← Model ID constants
lib/web-search.ts          ← web_search tool definition + Brave/Tavily execution
lib/fetch-page.ts          ← read_url tool definition + URL fetch + HTML stripping
lib/calculator.ts          ← calculate tool definition + safe math parser
lib/note-store.ts          ← save_note/read_notes tools + file-based persistence
lib/search-engines.ts      ← Engine labels
components/chat/           ← Chat UI (container, messages, input, bubbles)
components/controls/       ← Model selector, temperature slider, system prompt, cost panel
```

**Request flow:** `ChatInput` → slash command check → `sendMessage` → `POST /api/chat` → SSE stream → `use-stream-reader` → tokens appended to active message + usage accumulated.

**Research flow:** `/research <topic>` → `useResearch` → `POST /api/research` → Haiku generates queries → web search → URL fetch → Sonnet synthesis → SSE stream to client.

**Retry flow:** On 429/529, route handler sleeps with exponential backoff and sends a `retry` SSE event. Client shows toast: `"Rate limited. Retry N/3 in Xs…"`

## Stack

| Tool | Version |
|---|---|
| Next.js (App Router) | 16.2.4 |
| @anthropic-ai/sdk | 0.91.x |
| shadcn/ui | CLI v4 |
| Tailwind CSS | 4.x |
| react-markdown | 10.x |
| remark-gfm | 4.x |
| react-syntax-highlighter | 16.x |
| lucide-react | 1.x |
| sonner | 2.x |
| TypeScript | 5.x |
| pnpm | 10.x |
