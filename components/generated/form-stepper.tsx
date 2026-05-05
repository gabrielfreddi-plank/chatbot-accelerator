'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface FormStepperProps {
  steps: string[]
  value?: number
  onChange?: (step: number) => void
}

export function GeneratedFormStepper({ steps, value = 0, onChange }: FormStepperProps) {
  return (
    <nav className="flex items-center gap-0 mb-4">
      {steps.map((step, i) => {
        const isComplete = i < value
        const isActive = i === value
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => onChange?.(i)}
              className={cn(
                'flex items-center gap-2 shrink-0 transition-colors',
                isActive && 'text-indigo-400',
                isComplete && 'text-emerald-400',
                !isActive && !isComplete && 'text-muted-foreground/40',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center h-6 w-6 rounded-full border text-[10px] font-semibold shrink-0 transition-colors',
                  isActive && 'border-indigo-500 bg-indigo-500/20 text-indigo-400',
                  isComplete && 'border-emerald-500 bg-emerald-500/20 text-emerald-400',
                  !isActive && !isComplete && 'border-border/40 text-muted-foreground/40',
                )}
              >
                {isComplete ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 transition-colors',
                  i < value ? 'bg-emerald-500/40' : 'bg-border/30',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
