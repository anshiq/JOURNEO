import { cn } from '@shared/ui/cn'
import { X } from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import type { ReactNode } from 'react'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string | undefined
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  className?: string
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <D.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-xl outline-none',
            wide ? 'max-w-4xl' : 'max-w-lg',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <D.Title className="text-base font-semibold text-slate-900">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-slate-600">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
