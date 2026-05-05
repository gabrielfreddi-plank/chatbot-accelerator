# Next Steps

## Current State
- Storage: localStorage only
- Token counting: Anthropic SSE usage events (exact, post-request)
- Context: full history sent every request (no truncation)
- Memory: flat `data/notes.json`, no semantic retrieval
- User identity: none (anonymous browser)

---

## 1. User Identity (prerequisite for everything)

**File:** `lib/user-id.ts`

Generate stable UUID on first visit, persist in `localStorage` + cookie (so server-side API routes can read it). Send as `X-User-ID` header on all `/api/chat` requests. No auth — browser = user.

---

## 2. SQL Long-Term Storage

**Stack:** Neon (PostgreSQL via Vercel Marketplace) + Drizzle ORM

**Schema:**
```sql
users(id uuid PK, created_at)
conversations(id, user_id FK, title, model, temperature, system_prompt, search_engine, created_at, updated_at)
messages(id, conversation_id FK, role, content, model, created_at)
memories(id, user_id FK, content, category, embedding vector(1536), created_at, updated_at)
```

**Files:**
- `lib/db.ts` — Drizzle client + connection
- `lib/schema.ts` — table definitions
- `app/api/conversations/route.ts` — GET/POST/DELETE
- `app/api/conversations/[id]/messages/route.ts` — GET/POST

Migrate `lib/conversations.ts` and `lib/creations.ts` to write-through: localStorage stays as optimistic cache, SQL is source of truth on load.

---

## 3. tiktoken Token Counter

**Package:** `js-tiktoken` (WASM, works in browser + Node)

**File:** `lib/tokenizer.ts` — `countTokens(messages, model): number` using `cl100k_base`

**Uses:**
- Pre-request token estimate shown in chat input (character count → token count)
- Feeds into context manager (§5) to decide when to summarize
- Enhances cost panel with pre-send estimates

---

## 4. Semantic Cache (Redis)

**Stack:** Upstash Redis + Upstash Vector

**File:** `lib/semantic-cache.ts`

**Flow:**
1. Incoming request → embed last user message via `text-embedding-3-small`
2. Query Upstash Vector for nearest neighbors (threshold ~0.92)
3. Hit → return cached SSE payload as replay stream (skip Anthropic call)
4. Miss → call Anthropic → cache response + embedding with 24h TTL

**Cache key scope:** last message + model + temperature bucket (0.0–0.3, 0.4–0.7, 0.8–1.0)

Modify `app/api/chat/route.ts` to wrap model call in cache check/set. Add `X-Cache: HIT|MISS` response header + SSE event `{ type: 'cache_hit' }` so client can show a badge.

---

## 5. Context Management (Intelligent Truncation + Summarization)

**File:** `lib/context-manager.ts`

**Logic:**
```
if tokenCount(messages) > SUMMARIZE_THRESHOLD (60k tokens):
  oldest_chunk = messages[0..N] where N covers first 40k tokens
  summary = await haiku.message("Summarize this conversation segment...")
  return [{ role: 'user', content: '[Summary of earlier conversation: ...]' }, ...rest]
```

Called in `app/api/chat/route.ts` before building `currentMessages`, transparent to client. Summary message flagged with `[SUMMARY]` prefix so model understands it.

Add `use-context-health.ts` hook that reads token count from last usage event and warns when approaching limit.

---

## 6. User Memory — Model-Driven Storage

**File:** `lib/user-memory.ts`

**Two new tools added to chat API (always active):**
- `save_user_memory(content: string, category: 'preference' | 'fact' | 'goal' | 'context')`
- `search_memories(query: string)` — semantic search over vector embeddings

**System prompt addendum (always injected):**
> "When you learn something relevant and durable about the user (preferences, goals, personal facts), call `save_user_memory`. When the user's question might be informed by past context, call `search_memories`."

**At conversation start:** top-5 most recent memories injected into system prompt automatically (no tool call needed).

**Storage:** `memories` table with pgvector embeddings. Embeddings computed server-side via `text-embedding-3-small` on save.

---

## 7. Settings Page — Memory Management

**Files:**
- `app/settings/page.tsx` — settings shell
- `components/settings/memory-manager.tsx` — memory list + delete UI
- `app/api/memories/route.ts` — `GET ?userId=` / `DELETE /[id]`

**UI:**
- Accessible from `AppShell` header (gear icon)
- Memory cards grouped by category with timestamp
- Delete individual or all
- Search/filter by category or text
- Cache stats panel (hit rate, total cached, TTL info)

---

## Dependencies to Add

```
js-tiktoken              # token counting (WASM)
drizzle-orm              # SQL ORM
@neondatabase/serverless # Neon PostgreSQL
@upstash/redis           # Redis cache
@upstash/vector          # vector similarity
openai                   # embeddings (text-embedding-3-small via AI Gateway)
```

---

## Sequencing

| Phase | Work | Blocks |
|---|---|---|
| 1 | User ID + DB schema + Drizzle setup | everything |
| 2 | SQL storage migration | memory storage, settings page |
| 3 | tiktoken | context manager |
| 4 | Context manager | independent after tiktoken |
| 5 | User memory tools + retrieval | needs DB |
| 6 | Semantic cache | needs embeddings infra (same as memory) |
| 7 | Settings page | needs memory API |

Phases 3+4 and 5+6 can run in parallel once Phase 1 is done.

---

## What Stays Unchanged
- SSE streaming architecture
- All existing tools (web search, calculator, notes, UI builder)
- localStorage as optimistic cache layer (conversations load instantly)
- `data/notes.json` notes (separate from memories, different use case)
