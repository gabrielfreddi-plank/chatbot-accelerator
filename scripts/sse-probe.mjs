// Diagnostic: hits the local /api/chat endpoint with the UI tool enabled and
// prints every SSE event with a high-resolution timestamp. With the two-step
// protocol, the wire should show:
//   ui_loading → ui_skeleton → ui_fill (×N, spread across model turns) → ui_render
// If ui_fill events land naturally spaced (hundreds of ms to seconds apart),
// the model is genuinely streaming progress turn-by-turn. If they bunch up at
// the very end, the model isn't following the two-step prompt.
//
// Usage: node scripts/sse-probe.mjs "build a dashboard with 4 cards"

const prompt = process.argv[2] ?? 'Build a dashboard with 4 KPI cards: revenue, users, signups, churn.'

const start = Date.now()
const res = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Disable any compression layer that might buffer chunks while it
    // accumulates enough bytes to compress efficiently.
    'Accept-Encoding': 'identity',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: prompt }],
    model: process.env.PROBE_MODEL ?? 'claude-sonnet-4-6',
    temperature: 0.7,
    systemPrompt: 'You are a UI dashboard builder.',
    searchEngine: 'none',
    enableUiTool: true,
  }),
})

if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`)
  console.error(await res.text())
  process.exit(1)
}

console.log(`[+${Date.now() - start}ms] response started`)

const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''
let chunkCount = 0
let skeletonAt = null
let fillCount = 0
let firstFillAt = null
let lastFillAt = null

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  chunkCount++
  const chunkAt = Date.now() - start
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice('data: '.length)
    if (!raw) continue
    let evt
    try {
      evt = JSON.parse(raw)
    } catch {
      continue
    }
    const at = Date.now() - start
    let detail = ''
    if (evt.type === 'ui_skeleton') {
      skeletonAt = at
      const ids = Object.keys(evt.spec?.elements ?? {})
      detail = `root=${evt.spec?.root} elements=${ids.length} [${ids.join(', ')}]`
    } else if (evt.type === 'ui_fill') {
      fillCount++
      if (firstFillAt === null) firstFillAt = at
      const sinceLast = lastFillAt === null ? at - (skeletonAt ?? 0) : at - lastFillAt
      lastFillAt = at
      const propKeys = Object.keys(evt.props ?? {})
      detail = `id=${evt.id} props=[${propKeys.join(',')}] (Δ${sinceLast}ms)`
    } else if (evt.type === 'token') {
      detail = JSON.stringify(evt.text).slice(0, 40)
    } else if (evt.type === 'usage') {
      detail = `in=${evt.inputTokens} out=${evt.outputTokens}`
    } else if (evt.type === 'error') {
      detail = JSON.stringify(evt.message)
    } else if (evt.type === 'ui_render') {
      const filled = Object.values(evt.spec?.elements ?? {}).filter(
        (e) => Object.keys(e.props ?? {}).length > 0,
      ).length
      const total = Object.keys(evt.spec?.elements ?? {}).length
      detail = `elements=${total} filled=${filled}`
    }
    console.log(`[+${at}ms] (chunk ${chunkCount} @+${chunkAt}ms) ${evt.type} ${detail}`)
  }
}

const totalMs = Date.now() - start
console.log(`\nTotal: ${chunkCount} network chunks, ${fillCount} ui_fill events, ${totalMs}ms`)
if (skeletonAt !== null && firstFillAt !== null) {
  console.log(`  skeleton arrived @+${skeletonAt}ms`)
  console.log(`  first fill   @+${firstFillAt}ms (gap: ${firstFillAt - skeletonAt}ms after skeleton)`)
  console.log(`  last fill    @+${lastFillAt}ms (spread: ${lastFillAt - firstFillAt}ms across all fills)`)
}
