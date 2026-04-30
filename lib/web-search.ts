import type Anthropic from '@anthropic-ai/sdk'
import type { SearchEngine } from './types'

export const webSearchTool: Anthropic.Tool = {
  name: 'web_search',
  description:
    'Search the web for up-to-date information. Use when asked about current events, recent data, or facts that may have changed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
}

export async function executeSearch(query: string, engine: SearchEngine): Promise<string> {
  if (engine === 'brave') {
    const key = process.env.BRAVE_SEARCH_API_KEY
    if (!key) return 'Error: BRAVE_SEARCH_API_KEY is not configured.'
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    })
    if (!res.ok) return `Error: Brave Search returned ${res.status}`
    const data = await res.json()
    const results: Array<{ title: string; url: string; description?: string }> =
      data.web?.results ?? []
    if (!results.length) return 'No results found.'
    return results.map((r) => `${r.title}\n${r.url}\n${r.description ?? ''}`).join('\n\n')
  }

  if (engine === 'tavily') {
    const key = process.env.TAVILY_API_KEY
    if (!key) return 'Error: TAVILY_API_KEY is not configured.'
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, max_results: 5 }),
    })
    if (!res.ok) return `Error: Tavily returned ${res.status}`
    const data = await res.json()
    const results: Array<{ title: string; url: string; content?: string }> =
      data.results ?? []
    if (!results.length) return 'No results found.'
    return results.map((r) => `${r.title}\n${r.url}\n${r.content ?? ''}`).join('\n\n')
  }

  return 'No search engine selected.'
}
