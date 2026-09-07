import * as React from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion'
import { cn } from '@/lib/utils'

export function El({ title, children, enabled = true, onToggle, defaultOpen = false }: { title: string; children: React.ReactNode; enabled?: boolean; onToggle?: () => void; defaultOpen?: boolean }) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? 'el' : undefined} className="border border-border bg-muted/20 px-3">
      <AccordionItem value="el" className="border-b-0">
        <div className="flex items-center justify-between gap-2">
          <AccordionTrigger className="flex-1 py-3">{title}</AccordionTrigger>
          {onToggle && <button type="button" onClick={onToggle} className={cn('text-eyebrow shrink-0 border px-2 py-0.5', enabled ? 'border-foreground text-foreground' : 'border-border text-muted-foreground')}>{enabled ? 'Enabled' : 'Disabled'}</button>}
        </div>
        <AccordionContent>
          {enabled ? children : <div className="text-[11px] italic text-muted-foreground">Disabled — click Enable to add back</div>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
