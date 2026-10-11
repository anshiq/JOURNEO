import { writeEditorToken } from '@shared/api/token'
import { strings } from '@shared/strings'
import { TextInput } from '@shared/ui/primitives/TextInput'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function TokenGate() {
  const [value, setValue] = useState('')
  const client = useQueryClient()
  return (
    <form
      className="mx-auto mt-24 max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={event => {
        event.preventDefault()
        writeEditorToken(value.trim() || null)
        void client.invalidateQueries()
      }}
    >
      <h1 className="text-lg font-semibold">{strings.editorToken}</h1>
      <p className="text-sm text-slate-600">{strings.editorTokenHelp}</p>
      <TextInput
        type="text"
        autoComplete="current-password"
        maxLength={200}
        value={value}
        onChange={event => setValue(event.target.value)}
        aria-label={strings.editorToken}
      />
      <button type="submit" className="h-9 w-full rounded-md bg-indigo-600 text-sm font-medium text-white">
        {strings.save}
      </button>
    </form>
  )
}
