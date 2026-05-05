'use client'

import type { ReactNode } from 'react'
import { GeneratedBarChart } from '@/components/generated/bar-chart'
import { GeneratedLineChart } from '@/components/generated/line-chart'
import { GeneratedPieChart } from '@/components/generated/pie-chart'
import { GeneratedDataTable } from '@/components/generated/data-table'
import { GeneratedTabs } from '@/components/generated/tabs'
import { GeneratedCard } from '@/components/generated/card'
import { GeneratedCardGrid } from '@/components/generated/card-grid'
import { GeneratedChartContainer } from '@/components/generated/chart-container'
import { GeneratedTableToolbar } from '@/components/generated/table-toolbar'
import { GeneratedPaginationControls } from '@/components/generated/pagination-controls'
import { GeneratedInputField } from '@/components/generated/input-field'
import { GeneratedPasswordInput } from '@/components/generated/password-input'
import { GeneratedSelectField } from '@/components/generated/select-field'
import { GeneratedConditionalField } from '@/components/generated/conditional-field'
import { GeneratedValidationMessage } from '@/components/generated/validation-message'
import { GeneratedFormStepper } from '@/components/generated/form-stepper'
import { GeneratedButton } from '@/components/generated/button'
import { GeneratedAccordion } from '@/components/generated/accordion'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>

export type RegistryFn = (props: P, children: ReactNode) => ReactNode

export const REGISTRY: Record<string, RegistryFn> = {
  Stack: (props, children) => (
    <div className="flex flex-col gap-3 w-full" style={{ gap: props.gap ? `${props.gap * 4}px` : undefined }}>
      {children}
    </div>
  ),

  Card: (props, children) => (
    <GeneratedCard title={props.title} content={props.content}>{children}</GeneratedCard>
  ),

  CardGrid: (props, children) => (
    <GeneratedCardGrid columns={props.columns}>{children}</GeneratedCardGrid>
  ),

  ChartContainer: (props, children) => (
    <GeneratedChartContainer title={props.title} description={props.description}>
      {children}
    </GeneratedChartContainer>
  ),

  BarChart: (props) => (
    <GeneratedBarChart
      title={props.title}
      data={props.data ?? []}
      xKey={props.xKey ?? ''}
      bars={props.bars ?? []}
      onDrillDown={props.onDrillDown}
    />
  ),

  LineChart: (props) => (
    <GeneratedLineChart
      title={props.title}
      data={props.data ?? []}
      xKey={props.xKey ?? ''}
      lines={props.lines ?? []}
    />
  ),

  PieChart: (props) => (
    <GeneratedPieChart
      title={props.title}
      data={props.data ?? []}
      donut={props.donut}
      showLegend={props.showLegend}
      onDrillDown={props.onDrillDown}
    />
  ),

  DataTable: (props) => (
    <GeneratedDataTable
      title={props.title}
      columns={props.columns ?? []}
      rows={props.rows ?? []}
    />
  ),

  TableToolbar: (props) => (
    <GeneratedTableToolbar
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.onChange}
    />
  ),

  PaginationControls: (props) => (
    <GeneratedPaginationControls
      totalPages={props.totalPages ?? 1}
      value={props.value}
      onChange={props.onChange}
    />
  ),

  InputField: (props) => (
    <GeneratedInputField
      label={props.label ?? ''}
      type={props.type}
      placeholder={props.placeholder}
      required={props.required}
      value={props.value}
      onChange={props.onChange}
    />
  ),

  PasswordInput: (props) => (
    <GeneratedPasswordInput
      label={props.label ?? ''}
      placeholder={props.placeholder}
      required={props.required}
      value={props.value}
      onChange={props.onChange}
    />
  ),

  SelectField: (props) => (
    <GeneratedSelectField
      label={props.label ?? ''}
      options={props.options ?? []}
      required={props.required}
      value={props.value}
      onChange={props.onChange}
    />
  ),

  ConditionalField: (_props, children) => (
    <GeneratedConditionalField>{children}</GeneratedConditionalField>
  ),

  ValidationMessage: (props) => (
    <GeneratedValidationMessage value={props.value} />
  ),

  FormStepper: (props) => (
    <GeneratedFormStepper
      steps={props.steps ?? []}
      value={props.value}
      onChange={props.onChange}
    />
  ),

  Button: (props) => (
    <GeneratedButton
      label={props.label ?? 'Submit'}
      variant={props.variant}
      disabled={props.disabled}
      onPress={props.onPress}
    />
  ),

  Tabs: (props) => (
    <GeneratedTabs
      tabs={props.tabs ?? []}
      defaultTab={props.defaultTab}
    />
  ),

  TabPanel: (_props, children) => (
    <div className="p-3">{children}</div>
  ),

  Accordion: (props) => (
    <GeneratedAccordion items={props.items ?? []} />
  ),
}
