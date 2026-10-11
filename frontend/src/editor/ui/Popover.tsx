import { cn } from '@shared/ui/cn'
import { Popover as P } from 'radix-ui'
import type { ReactNode } from 'react'

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  side = 'bottom',
  className,
}: {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}) {
  return (
    <P.Root {...(open === undefined ? {} : { open })} {...(onOpenChange ? { onOpenChange } : {})}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 max-h-[min(70vh,var(--radix-popover-content-available-height))] w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg outline-none',
            className,
          )}
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}

export const PopoverClose = P.Close
