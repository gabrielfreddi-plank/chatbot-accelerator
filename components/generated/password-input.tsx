'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
  label: string
  placeholder?: string
  required?: boolean
  value?: string
  onChange?: (v: string) => void
}

export function GeneratedPasswordInput({ label, placeholder, required, value = '', onChange }: PasswordInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground/70">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
