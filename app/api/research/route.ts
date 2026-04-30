import Anthropic from '@anthropic-ai/sdk'
import type { ApiResearchRequest } from '@/lib/types'
import { MODEL_IDS } from '@/lib/models'
import { executeSearch } from '@/lib/web-search'
import { executeReadUrl } from '@/lib/fetch-page'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractUrls(searchResult: string): string[] {
  return searchResult
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http://') || l.startsWith('https://'))
}

export async function POST(request: Request) {
  const body: ApiResearchRequest = await request.json()
  const { topic, searchEngine } = body

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        // Step 1 — Haiku: generate 3 search queries
        send({ type: 'research_step', step: 1, label: 'Generating search queries…' })

        const queryRes = await client.messages.create({
          model: MODEL_IDS.haiku,
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: `Generate exactly 3 specific, targeted search queries that together provide comprehensive coverage of this topic. Return ONLY a valid JSON array of 3 strings, nothing else.\n\nTopic: ${topic}`,
            },
          ],
        })
        send({
          type: 'usage',
          inputTokens: queryRes.usage.input_tokens,
          outputTokens: queryRes.usage.output_tokens,
          model: 'haiku',
        })

        const queryText = queryRes.content.find((b) => b.type === 'text')?.text ?? '[]'
        let queries: string[]
        try {
          const parsed = JSON.parse(queryText)
          if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('bad format')
          queries = parsed.slice(0, 3).map(String)
        } catch {
          const matches = queryText.match(/"([^"]+)"/g)
          queries = matches ? matches.slice(0, 3).map((s) => s.slice(1, -1)) : [topic]
        }
        send({ type: 'research_queries', queries })

        // Step 2 — execute searches with Haiku-generated queries
        send({ type: 'research_step', step: 2, label: 'Searching the web…' })

        const searchResults: Array<{ query: string; result: string }> = []
        for (const query of queries) {
          send({ type: 'research_search', query })
          const result = await executeSearch(query, searchEngine)
          send({ type: 'tool_result', result: result.slice(0, 2000), kind: 'search' })
          searchResults.push({ query, result })
        }

        // Step 3 — Sonnet: fetch top 3 unique URLs from results
        send({ type: 'research_step', step: 3, label: 'Reading top sources…' })

        const seenUrls = new Set<string>()
        const topUrls: string[] = []
        for (const { result } of searchResults) {
          for (const url of extractUrls(result)) {
            if (!seenUrls.has(url)) {
              seenUrls.add(url)
              topUrls.push(url)
              if (topUrls.length >= 3) break
            }
          }
          if (topUrls.length >= 3) break
        }

        const fetchedPages: Array<{ url: string; content: string }> = []
        for (const url of topUrls) {
          send({ type: 'research_fetch', url })
          const content = await executeReadUrl(url)
          send({ type: 'tool_result', result: content.slice(0, 600), kind: 'fetch' })
          fetchedPages.push({ url, content })
        }

        // Step 4 — Sonnet: synthesize report (streamed)
        send({ type: 'research_step', step: 4, label: 'Synthesizing report…' })

        const sourcesBlock = fetchedPages
          .map((p, i) => `### Source ${i + 1}: ${p.url}\n\n${p.content.slice(0, 3000)}`)
          .join('\n\n---\n\n')

        const synthesisPrompt = `You are a research analyst. Write a comprehensive, well-structured research report on the topic below based on the provided source content.

Format as markdown:
- Title as # heading
- Executive summary
- Multiple substantive ## sections
- A final ## Sources section listing the URLs cited

Be precise, cite specific facts, and note where sources agree or conflict.

Topic: ${topic}
Queries used: ${queries.join(' | ')}

---

${sourcesBlock}`

        const synthStream = client.messages.stream({
          model: MODEL_IDS.sonnet,
          max_tokens: 4096,
          messages: [{ role: 'user', content: synthesisPrompt }],
        })

        for await (const event of synthStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ type: 'token', text: event.delta.text })
          } else if (event.type === 'message_start') {
            send({ type: 'usage', inputTokens: event.message.usage.input_tokens, outputTokens: 0, model: 'sonnet' })
          } else if (event.type === 'message_delta') {
            send({ type: 'usage', inputTokens: 0, outputTokens: event.usage.output_tokens, model: 'sonnet' })
          }
        }

        send({ type: 'done' })
        controller.close()
      } catch (err) {
        send({ type: 'error', message: (err as Error).message ?? 'Research failed' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
