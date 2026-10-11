import { cn } from '@shared/ui/cn'
import type { ComponentPropsWithRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'sm' | 'md' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  link: 'text-indigo-700 underline-offset-2 hover:underline',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'h-8 w-8 justify-center',
}

export type ButtonProps = ComponentPropsWithRef<'button'> & { variant?: Variant; size?: Size }

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md font-medium whitespace-nowrap transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  )
}
