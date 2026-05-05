'use client'

import { cn } from '@/lib/utils'

type InputType = 'text' | 'email' | 'number' | 'tel' | 'url' | 'textarea'

interface InputFieldProps {
  label: string
  type?: InputType
  placeholder?: string
  required?: boolean
  value?: string
  onChange?: (v: string) => void
}

export function GeneratedInputField({ label, type = 'text', placeholder, required, value = '', onChange }: InputFieldProps) {
  const baseClass = "w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"

  return (
    <div className="space-y-1.5">
      <label className={cn("block text-xs font-medium text-muted-foreground/70")}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className={cn(baseClass, 'resize-none')}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={baseClass}
        />
      )}
    </div>
  )
}
