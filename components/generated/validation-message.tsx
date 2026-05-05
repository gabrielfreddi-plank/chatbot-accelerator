'use client'

interface ValidationMessageProps {
  value?: string
}

export function GeneratedValidationMessage({ value }: ValidationMessageProps) {
  if (!value) return null
  return (
    <p className="text-xs text-red-400 mt-0.5">{value}</p>
  )
}
