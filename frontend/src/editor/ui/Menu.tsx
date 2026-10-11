import { cn } from '@shared/ui/cn'
import { DropdownMenu as M } from 'radix-ui'
import type { ReactNode } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export function Menu({
  trigger,
  items,
  align = 'end',
}: {
  trigger: ReactNode
  items: (MenuItem | 'separator')[]
  align?: 'start' | 'end'
}) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align={align}
          sideOffset={4}
          className="z-50 min-w-44 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg"
        >
          {items.map((item, index) =>
            item === 'separator' ? (
              <M.Separator key={`sep-${index.toString()}`} className="my-1 h-px bg-slate-200" />
            ) : (
              <M.Item
                key={item.label}
                disabled={item.disabled ?? false}
                onSelect={item.onSelect}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-slate-100',
                  item.danger && 'text-rose-700',
                )}
              >
                {item.icon}
                {item.label}
              </M.Item>
            ),
          )}
        </M.Content>
      </M.Portal>
    </M.Root>
  )
}
