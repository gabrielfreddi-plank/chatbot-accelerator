'use client'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  options: Option[]
  required?: boolean
  value?: string
  onChange?: (v: string) => void
}

export function GeneratedSelectField({ label, options, required, value = '', onChange }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground/70">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/40 cursor-pointer"
      >
        <option value="" disabled>Select…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
