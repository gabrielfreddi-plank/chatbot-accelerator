# Generative UI — Implementation Plan

## Context

The app has a working generative UI system (15 components, per-component `render_component` tool calls, custom Zod switch-block validation). This plan rebuilds it using `@json-render/core` + `@json-render/react` (Vercel Labs, v0.18+, Apache 2.0) to get:

- A proper catalog/registry architecture
- 20+ components matching the required list (charts, tables, forms, cards, interactive)
- Composable UI trees — components can contain children; forms can have steps and conditional fields
- Interactivity: form submissions → AI message, chart drill-downs → AI follow-up, tab switching (client-only)

**What changes:** tool format (`render_component` per-call → `render_ui` single tree), catalog definition (manual Zod switch → `defineCatalog()`), rendering (`GeneratedUI` dispatcher → `<JsonRenderer>`), types (`generatedComponents[]` → `uiSpec: Spec`).

**What stays:** SSE streaming infra, all existing tools (web_search, calculate, notes), existing chart SVG implementations.

---

## Component Catalog (20 components)

All defined via `defineCatalog()` with Zod schemas. AI generates a JSON element tree.

| Category | Components |
|---|---|
| **Layout** | Stack, Card, CardGrid |
| **Charts** | BarChart, LineChart, PieChart, ChartContainer |
| **Data Tables** | DataTable, TableToolbar, PaginationControls |
| **Forms** | InputField, PasswordInput, SelectField, ConditionalField, ValidationMessage, FormStepper |
| **Interactive** | Button, Tabs + TabPanel, Accordion |

**Actions (2):** `submitForm` (sends form data as user message), `chartDrillDown` (sends data point as user message).

---

## JSON Tree Format (render_ui tool)

The AI generates a flat element graph in a single tool call:

```json
{
  "root": "el-1",
  "elements": {
    "el-1": { "type": "CardGrid", "props": { "columns": 3 }, "children": ["el-2", "el-3"] },
    "el-2": { "type": "Card",    "props": { "title": "Revenue" }, "children": ["el-4"] },
    "el-3": { "type": "Card",    "props": { "title": "Users" },   "children": ["el-5"] },
    "el-4": { "type": "BarChart","props": { "data": [...], "xKey": "month", "bars": [...] } },
    "el-5": { "type": "LineChart","props": { "data": [...], "xKey": "month", "lines": [...] } }
  },
  "state": {}
}
```

Children are referenced by element ID. State is initial json-render state (used for form field values, step counters, validation errors).

---

## Architecture

```
AI generates render_ui JSON tree
  ↓
API route: validate tree with catalog schemas
  ↓
Send { type: 'ui_loading' } SSE on content_block_start
Send { type: 'ui_render', spec: Spec } SSE on validation success
  ↓
use-chat: store spec in message.uiSpec, clear uiLoading
  ↓
message-bubble: <JsonRenderUI spec={message.uiSpec} onAction={...} />
  ↓
onAction('submitForm', params) → sendMessage(params.message)
onAction('chartDrillDown', params) → sendMessage(`Tell me more: ${params.dataPoint}`)
```

---

## Files to Create / Modify / Delete

### New files
| File | Purpose |
|---|---|
| `lib/ui-action-context.ts` | React context holding `sendMessage` for interactivity |
| `lib/ui-catalog.ts` | `defineCatalog()` with all 20 components + 2 actions + Anthropic tool export |
| `lib/ui-registry.tsx` | Registry binding catalog entries to React component implementations |
| `components/generated/json-render-ui.tsx` | `<JsonRenderUI>` wrapper using `createRenderer` |
| `components/chat/ui-action-provider.tsx` | Wraps ChatMessages, exposes `sendMessage` via context |
| `components/generated/chart-container.tsx` | Title + description wrapper for charts |
| `components/generated/table-toolbar.tsx` | Search + filter row above DataTable |
| `components/generated/pagination-controls.tsx` | Page nav, reads `/pagination` from json-render state |
| `components/generated/input-field.tsx` | Labeled input (text/email/number/tel/url/textarea), `$bindState` |
| `components/generated/password-input.tsx` | Password field with show/hide toggle |
| `components/generated/select-field.tsx` | Dropdown, `$bindState` |
| `components/generated/conditional-field.tsx` | Container shown/hidden via json-render `visible` |
| `components/generated/validation-message.tsx` | Reads `/formValidation/errors/{name}` from state |
| `components/generated/form-stepper.tsx` | Step nav bar, reads `/currentStep` from state |
| `components/generated/card.tsx` | Bordered content block |
| `components/generated/card-grid.tsx` | Responsive CSS grid (1-4 cols) |
| `components/generated/button.tsx` | primary/secondary/ghost/danger variants, emits `press` |
| `components/generated/accordion.tsx` | Collapsible sections |
| `generative.md` | Architecture + component reference documentation |

### Modified files
| File | Change |
|---|---|
| `lib/types.ts` | Replace `generatedComponents[]` + `generatedLoading` → `uiSpec: Spec \| null` + `uiLoading: boolean` |
| `hooks/use-stream-reader.ts` | Add `ui_loading`, `ui_render` event types; remove old component events |
| `hooks/use-chat.ts` | Replace `component_loading/render` handlers; update `flushPending` to clear `uiLoading` |
| `app/api/chat/route.ts` | Swap `renderComponentTool` → `renderUiTool`; replace handler block |
| `components/chat/message-bubble.tsx` | Replace `<GeneratedUI>` with `<JsonRenderUI spec={...} onAction={...} />` |
| `components/chat/chat-container.tsx` | Wrap `<ChatMessages>` with `<UIActionProvider sendMessage={sendMessage}>` |
| `README.md` + `CLAUDE.md` | Document the generative UI system |

### Deleted files (after migration)
- `lib/component-catalog.ts`
- `components/generated/generated-ui.tsx`
- `components/generated/form.tsx` → replaced by individual field components
- `components/generated/kpi-grid.tsx`, `stat-card.tsx`, `alert.tsx`, `callout.tsx`
- `components/generated/timeline.tsx`, `heatmap.tsx`, `gauge.tsx`, `progress-list.tsx`, `image-gallery.tsx`

### Kept (reused in registry)
- `components/generated/bar-chart.tsx`
- `components/generated/line-chart.tsx`
- `components/generated/pie-chart.tsx`
- `components/generated/data-table.tsx`
- `components/generated/tabs.tsx` (adapted for Tabs + TabPanel)

---

## Key Implementation Details

### Interactivity flow

`UIActionProvider` wraps `<ChatMessages>` in `chat-container.tsx`. It stores `sendMessage` in a React context. `message-bubble.tsx` reads this context and passes an `onAction` callback to `<JsonRenderUI>`, which forwards it to `createRenderer`. No global refs needed:

```tsx
// message-bubble.tsx
const { sendMessage } = useUIActions()

<JsonRenderUI
  spec={message.uiSpec}
  loading={message.uiLoading}
  onAction={(action, params, state) => {
    if (action === 'submitForm')
      sendMessage(params?.message ?? `Form submitted: ${JSON.stringify(state)}`)
    if (action === 'chartDrillDown')
      sendMessage(`Tell me more about: ${params?.dataPoint}`)
  }}
/>
```

### Form state

Forms use json-render's `StateProvider`. The AI-generated spec must include `state: { "form": {}, "currentStep": 0, "formValidation": { "errors": {} } }`. Field components use `$bindState: "/form/fieldName"`. `ConditionalField` uses the element-level `visible` field (e.g., `"visible": { "$state": "/form/country", "eq": "US" }`). `ValidationMessage` reads `/formValidation/errors/{fieldName}`. All built-in to json-render — no custom context needed.

### API route changes

```typescript
// On content_block_start for render_ui tool:
if (toolName === 'render_ui') send({ type: 'ui_loading' })

// On tool complete:
} else if (toolName === 'render_ui') {
  const rawSpec = JSON.parse(toolInputJson || '{}')
  const validation = catalog.validate(rawSpec)  // or per-element Zod fallback
  if (!validation.success) {
    result = `Invalid UI spec: ${validation.error.message}`
  } else {
    send({ type: 'ui_render', spec: validation.data })
    result = 'UI rendered successfully.'
  }
}
```

Also append `catalog.prompt()` to the system prompt so Claude always knows the component vocabulary (or write the prompt string manually if the method doesn't exist in the installed version).

### Anthropic tool input_schema

```typescript
{
  type: 'object',
  properties: {
    root: { type: 'string' },
    elements: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: COMPONENT_NAMES },
          props: { type: 'object', additionalProperties: true },
          children: { type: 'array', items: { type: 'string' } },
          on: { type: 'object', additionalProperties: true },
          visible: { type: 'object', additionalProperties: true },
        },
        required: ['type', 'props'],
      },
    },
    state: { type: 'object', additionalProperties: true },
  },
  required: ['root', 'elements'],
}
```

### API risk: json-render version

Install then verify these specific APIs exist:
- `defineCatalog()` with `{ components, actions }` shape
- `createRenderer(catalog, componentMap)` or `<Renderer spec registry>`
- `$bindState`, `StateProvider`, `visible` element field
- `catalog.validate(spec)` — fallback: validate per-element with extracted Zod schemas
- `catalog.prompt()` — fallback: write tool description string manually

---

## Implementation Order

1. `pnpm add @json-render/core @json-render/react` → inspect installed types to confirm API
2. `lib/ui-action-context.ts` (tiny, no deps)
3. `lib/ui-catalog.ts` — catalog + Anthropic tool
4. New component files (pure React, no json-render dep yet)
5. `lib/ui-registry.tsx` — binds all components
6. `components/generated/json-render-ui.tsx`
7. `app/api/chat/route.ts` — swap tool + handler
8. `lib/types.ts` + `hooks/use-stream-reader.ts` — type changes
9. `hooks/use-chat.ts` — new event handlers
10. `components/chat/message-bubble.tsx` + `chat-container.tsx` + `ui-action-provider.tsx`
11. Delete obsolete files
12. `generative.md`, update `README.md` + `CLAUDE.md`
13. `npx tsc --noEmit` → fix any errors

---

## Verification

```bash
pnpm add @json-render/core @json-render/react
npx tsc --noEmit
pnpm dev
```

**Test prompts:**

1. **Dashboard:** "Show me a sales dashboard with revenue by month as a bar chart, a line chart of user growth, and a table of top products"
   → Expects CardGrid + BarChart + LineChart + DataTable in one UI tree

2. **Multi-step form with conditional:** "Create a user registration form with name, email, password, country selector, and a city field that only shows when country is US. Use multi-step navigation."
   → Expects FormStepper + InputField + PasswordInput + SelectField + ConditionalField; form submit → AI confirmation

3. **Chart drill-down:** "Show a pie chart of market share for Apple, Google, Microsoft, Amazon. I want to be able to click a slice to learn more."
   → PieChart with chartDrillDown action; click triggers new user message

4. **Tab switching:** "Show me a product overview with tabs for Description, Specs, and Reviews"
   → Tabs + TabPanel, client-side only (no AI call on tab switch)

5. **Form submit round-trip:** Fill a form → click submit → confirm AI receives form data and responds
