'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (prompt: string) => void
}

export function SystemPromptDialog({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleOpen(o: boolean) {
    if (o) setDraft(value)
    setOpen(o)
  }
  function handleSave() {
    onChange(draft.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
        title="System prompt"
        aria-label="Edit system prompt"
      >
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>System Prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="system-prompt" className="sr-only">
            System prompt
          </label>
          <Textarea
            id="system-prompt"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="You are a helpful assistant…"
            className="min-h-32 resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
