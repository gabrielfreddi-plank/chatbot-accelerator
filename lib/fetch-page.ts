import type Anthropic from '@anthropic-ai/sdk'

export const readUrlTool: Anthropic.Tool = {
  name: 'read_url',
  description:
    'Fetch a URL and return its text content. Use when the user provides a URL to read or when you need the full content of a specific page.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The full URL to fetch' },
    },
    required: ['url'],
  },
}

export async function executeReadUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChatbotAccelerator/1.0)' },
    })
    if (!res.ok) return `Error: HTTP ${res.status} fetching ${url}`
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 12000)
  } catch (err) {
    return `Error fetching URL: ${(err as Error).message}`
  }
}
