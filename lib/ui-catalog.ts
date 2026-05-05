import { z } from 'zod'
import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import type { UiElement, UiSpec } from '@/lib/types'

export const COMPONENT_NAMES = [
  'Stack', 'Card', 'CardGrid',
  'BarChart', 'LineChart', 'PieChart', 'ChartContainer',
  'DataTable', 'TableToolbar', 'PaginationControls',
  'InputField', 'PasswordInput', 'SelectField', 'ConditionalField', 'ValidationMessage', 'FormStepper',
  'Button', 'Tabs', 'Accordion', 'TabPanel',
] as const

export type ComponentName = typeof COMPONENT_NAMES[number]

// -----------------------------------------------------------------------------
// Two-step generative UI: render_ui_skeleton + fill_component
//
// Anthropic's API buffers `input_json_delta` events server-side and releases
// them in a single sub-second burst at the end of each tool_use block. A
// single render_ui call therefore appears to land "all at once" no matter
// what we do client-side. By splitting generation into many small tool
// invocations we make the model surface its progress turn-by-turn — each
// invocation is its own small burst, naturally separated by the model's
// real generation time between calls.
// -----------------------------------------------------------------------------

// Skeleton: id + type + (optional) children only. No props, no handlers.
const SkeletonElementSchema = z.object({
  type: z.enum(COMPONENT_NAMES),
  children: z.array(z.string()).optional(),
})

const SkeletonSpecSchema = z.object({
  root: z.string(),
  elements: z.record(z.string(), SkeletonElementSchema),
  state: z.record(z.string(), z.unknown()).optional(),
})

export type SkeletonSpec = z.infer<typeof SkeletonSpecSchema>

// Fill: props (and optional on/visible) for one element, addressed by id.
const OnHandlerSchema = z.object({
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

const FillSchema = z.object({
  id: z.string(),
  props: z.record(z.string(), z.unknown()),
  on: z.record(z.string(), OnHandlerSchema).optional(),
  visible: z.object({ $state: z.string(), eq: z.unknown() }).optional(),
})

export type FillPayload = z.infer<typeof FillSchema>

// Final-spec schema (for validating the assembled spec at end of stream).
const UiElementSchema = z.object({
  type: z.enum(COMPONENT_NAMES),
  props: z.record(z.string(), z.unknown()),
  children: z.array(z.string()).optional(),
  on: z.record(z.string(), OnHandlerSchema).optional(),
  visible: z.object({ $state: z.string(), eq: z.unknown() }).optional(),
})

const UiSpecSchema = z.object({
  root: z.string(),
  elements: z.record(z.string(), UiElementSchema),
  state: z.record(z.string(), z.unknown()).optional(),
})

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

function summarizeError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; ')
}

export function validateSkeleton(raw: unknown): ValidationResult<SkeletonSpec> {
  const r = SkeletonSpecSchema.safeParse(raw)
  if (r.success) return { success: true, data: r.data }
  return { success: false, error: summarizeError(r.error) }
}

export function validateFill(raw: unknown): ValidationResult<FillPayload> {
  const r = FillSchema.safeParse(raw)
  if (r.success) return { success: true, data: r.data }
  return { success: false, error: summarizeError(r.error) }
}

export function validateUiSpec(raw: unknown): ValidationResult<UiSpec> {
  const r = UiSpecSchema.safeParse(raw)
  if (r.success) return { success: true, data: r.data as UiSpec }
  return { success: false, error: summarizeError(r.error) }
}

// Convert a skeleton (type + children only) into a UiSpec where each
// element has an empty `props` object. The renderer treats elements with
// empty props + no children as skeleton placeholders.
export function skeletonToSpec(skeleton: SkeletonSpec): UiSpec {
  const elements: Record<string, UiElement> = {}
  for (const [id, el] of Object.entries(skeleton.elements)) {
    elements[id] = {
      type: el.type,
      props: {},
      ...(el.children ? { children: el.children } : {}),
    }
  }
  return { root: skeleton.root, elements, state: skeleton.state }
}

// Merge fill payload into the matching element in a spec. Returns a new
// spec; original is not mutated. If the id is unknown, the fill is
// inserted as a new element (lenient — model may extend the tree).
export function applyFill(spec: UiSpec, fill: FillPayload): UiSpec {
  const existing = spec.elements[fill.id]
  const next: UiElement = {
    type: existing?.type ?? 'Card',
    props: fill.props,
    ...(existing?.children ? { children: existing.children } : {}),
    ...(fill.on ? { on: fill.on } : {}),
    ...(fill.visible ? { visible: fill.visible } : {}),
  }
  return {
    ...spec,
    elements: { ...spec.elements, [fill.id]: next },
  }
}

export const renderUiSkeletonTool: Tool = {
  name: 'render_ui_skeleton',
  description: `STEP 1 — call exactly ONCE before any fill_component calls.

Declares the entire UI element tree as a graph: id → { type, children? }. No props, no data, no handlers — those come later via fill_component. Calling this immediately shows the user the layout shape so the UI doesn't appear all at once at the end of generation.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      root: { type: 'string', description: 'Element id of the root container' },
      elements: {
        type: 'object',
        description: 'Map of element id → { type, children? }',
        additionalProperties: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: [...COMPONENT_NAMES] },
            children: { type: 'array', items: { type: 'string' } },
          },
          required: ['type'],
        },
      },
      state: {
        type: 'object',
        description: 'Initial form/UI state. Optional. Recommended template: { "form": {}, "currentStep": 0, "formValidation": { "errors": {} } }',
        additionalProperties: true,
      },
    },
    required: ['root', 'elements'],
  },
}

export const fillComponentTool: Tool = {
  name: 'fill_component',
  description: `STEP 2 — call ONCE PER ELEMENT after render_ui_skeleton, in priority order (most important / above-the-fold first).

Provides full props (and optional on-handlers, visible rule) for one element, addressed by id. Each call makes that one component render with real content. Container elements (Stack, CardGrid, ChartContainer, ConditionalField, TabPanel) usually only need {} or minimal props (e.g. { columns: 3 }) and can be filled with empty/small props quickly. Leaf elements (Card, charts, fields) carry the data.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Element id declared in render_ui_skeleton' },
      props: {
        type: 'object',
        description: 'Component-specific props. See component reference.',
        additionalProperties: true,
      },
      on: {
        type: 'object',
        description: 'Event handlers — { eventName: { action, params? } }',
        additionalProperties: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            params: { type: 'object', additionalProperties: true },
          },
          required: ['action'],
        },
      },
      visible: {
        type: 'object',
        description: 'Conditional visibility — { $state: "/path", eq: value }',
        properties: {
          $state: { type: 'string' },
          eq: {},
        },
        required: ['$state', 'eq'],
      },
    },
    required: ['id', 'props'],
  },
}

export const UI_SYSTEM_PROMPT_ADDENDUM = `
---
GENERATIVE UI — TWO-STEP PROTOCOL.

For ANY dashboard, chart, table, or form request, generate the UI in two phases using the render_ui_skeleton and fill_component tools. This makes the UI render progressively for the user instead of appearing all at once.

PHASE 1 — render_ui_skeleton (call exactly once, FIRST):
  Declare the entire element tree as id → { type, children? }. NO props, NO data.
  Use semantic ids (e.g. "revenue-card", "users-chart"), not "el-1".
  Order children arrays in visual top-to-bottom / left-to-right order.

PHASE 2 — fill_component (call once per element, AFTER skeleton):
  One call per element, in priority order — fill the most important / above-the-fold elements first.
  Container elements (Stack, CardGrid, ChartContainer, ConditionalField, TabPanel) typically need only {} or minimal props ({ "columns": 3 }, etc.) — fill them quickly.
  Leaf elements (Card, BarChart, DataTable, InputField, etc.) carry the real data and content.

EXAMPLE FLOW:

  render_ui_skeleton({
    "root": "dashboard",
    "elements": {
      "dashboard": { "type": "Stack", "children": ["kpis", "revenue-chart"] },
      "kpis":      { "type": "CardGrid", "children": ["card-revenue", "card-users"] },
      "card-revenue": { "type": "Card" },
      "card-users":   { "type": "Card" },
      "revenue-chart": { "type": "BarChart" }
    },
    "state": { "form": {}, "currentStep": 0, "formValidation": { "errors": {} } }
  })

  fill_component({ "id": "dashboard", "props": { "gap": 4 } })
  fill_component({ "id": "kpis", "props": { "columns": 2 } })
  fill_component({ "id": "card-revenue", "props": { "title": "Revenue", "content": "## $128,450\\n+12% MoM" } })
  fill_component({ "id": "card-users",   "props": { "title": "Active Users", "content": "## 84,210\\n+8% MoM" } })
  fill_component({ "id": "revenue-chart", "props": { "title": "Revenue by Month", "data": [...], "xKey": "month", "bars": [...] } })

After the last fill_component, end your turn (do not summarize the UI — the user already sees it). The system finalizes the spec automatically.

COMPONENTS (20 total):
Layout:   Stack { gap? }  |  Card { title?, content?:"markdown" }  |  CardGrid { columns?: 1-4 }
Charts:   BarChart { title?, data, xKey, bars:[{key,label?,color?}] }
          LineChart { title?, data, xKey, lines:[{key,label?,color?}] }
          PieChart { title?, data:[{label,value,color?}], donut?, showLegend? }
          ChartContainer { title, description? }
Tables:   DataTable { title?, columns:[{key,label,align?}], rows }
          TableToolbar { placeholder?, "$bindState":"/searchPath" }
          PaginationControls { totalPages, "$bindState":"/currentPage" }
Forms:    InputField { label, type?:"text|email|number|tel|url|textarea", placeholder?, required?, "$bindState":"/form/field" }
          PasswordInput { label, placeholder?, "$bindState":"/form/password" }
          SelectField { label, options:[{value,label}], "$bindState":"/form/field" }
          ConditionalField (use "visible":{"$state":"/form/field","eq":"value"} on the fill_component call)
          ValidationMessage { "$bindState":"/formValidation/errors/field" }
          FormStepper { steps:string[], "$bindState":"/currentStep" }
Interactive: Button { label, variant?:"primary|secondary|ghost|danger" }
             Tabs { tabs:[{id,label,content:"markdown"}], defaultTab? }
             TabPanel { label? }
             Accordion { items:[{title,content}] }

ACTIONS (pass via fill_component's "on" field):
  Button submit: "on":{"press":{"action":"submitForm","params":{"message":"User submitted form: ..."}}}
  Chart drill:   "on":{"drillDown":{"action":"chartDrillDown"}}

STATE BINDING (in props): "$bindState":"/form/fieldName" injects value + onChange into the component.

COLORS: hex only — #6366f1 #10b981 #f59e0b #ef4444 #8b5cf6 #06b6d4 #f97316
---`
