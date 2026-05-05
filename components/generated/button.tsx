'use client'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps {
  label: string
  variant?: ButtonVariant
  disabled?: boolean
  onPress?: () => void
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm',
  secondary: 'bg-white/10 hover:bg-white/15 text-foreground/80 border border-border/40',
  ghost: 'hover:bg-white/5 text-muted-foreground/70 hover:text-foreground',
  danger: 'bg-red-600/80 hover:bg-red-500 text-white shadow-sm',
}

export function GeneratedButton({ label, variant = 'primary', disabled, onPress }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variantClass[variant],
      )}
    >
      {label}
    </button>
  )
}
