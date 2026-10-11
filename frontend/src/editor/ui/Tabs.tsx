import { cn } from '@shared/ui/cn'
import { Tabs as T } from 'radix-ui'
import type { ReactNode } from 'react'

export function Tabs({
  value,
  onChange,
  tabs,
  className,
}: {
  value: string
  onChange: (value: string) => void
  tabs: { value: string; label: string; content: ReactNode }[]
  className?: string
}) {
  return (
    <T.Root value={value} onValueChange={onChange} className={cn('flex min-h-0 flex-col', className)}>
      <T.List className="flex shrink-0 gap-1 border-b border-slate-200 px-3">
        {tabs.map(tab => (
          <T.Trigger
            key={tab.value}
            value={tab.value}
            className="-mb-px border-b-2 border-transparent px-2 py-2 text-xs font-medium text-slate-500 outline-none hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=active]:border-indigo-600 data-[state=active]:text-slate-900"
          >
            {tab.label}
          </T.Trigger>
        ))}
      </T.List>
      {tabs.map(tab => (
        <T.Content key={tab.value} value={tab.value} className="min-h-0 flex-1 overflow-y-auto outline-none">
          {tab.content}
        </T.Content>
      ))}
    </T.Root>
  )
}
