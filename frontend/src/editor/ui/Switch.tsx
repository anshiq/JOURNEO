import { Switch as S } from 'radix-ui'
import { useId } from 'react'

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <label htmlFor={id} className="text-sm text-slate-800">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      </label>
      <S.Root
        id={id}
        checked={checked}
        disabled={disabled ?? false}
        onCheckedChange={onChange}
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-slate-300 transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 data-[state=checked]:bg-indigo-600"
      >
        <S.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[18px]" />
      </S.Root>
    </div>
  )
}
