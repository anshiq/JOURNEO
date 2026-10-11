import type { EditableText } from '@experience/index'
import { updateElement } from '@journey/ops/index'
import { screenOutputs } from '@journey/ports'
import { parseRichText } from '@journey/richtext/parse'
import { serializeRichText } from '@journey/richtext/serialize'
import { LIMITS } from '@shared/limits.gen'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor as useTiptap } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Link2, List, ListOrdered, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Popover } from '../ui/Popover'
import { CheckListAttribute, InlineDocument, jsonToRich, richToJson, TokenNode } from './tiptap'

function serialize(json: ReturnType<typeof richToJson>): string {
  return serializeRichText(jsonToRich(json))
}

export function CanvasText(props: EditableText) {
  const selected = useEditor(
    state =>
      (state.selection.kind === 'element' || state.selection.kind === 'item') &&
      state.selection.elementId === props.elementId,
  )
  if (!selected) return <>{props.fallback}</>
  if (props.rich === 'plain') return <PlainText {...props} />
  return <RichEditor {...props} />
}

function limitFor(path: (string | number)[], rich: EditableText['rich']): number {
  if (path.at(-1) === 'question') return LIMITS.question
  return rich === 'inline' ? LIMITS.heading : LIMITS.text
}

function PlainText({ elementId, path, value }: EditableText) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const max = limitFor(path, 'plain')
  useEffect(() => {
    const node = ref.current
    if (node && document.activeElement !== node && node.textContent !== value) node.textContent = value
  }, [value])
  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      aria-label="Question text"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      className="block min-w-8 rounded outline-none ring-indigo-400 focus:ring-2"
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          ref.current?.blur()
        }
      }}
      onInput={event => {
        const text = (event.currentTarget.textContent ?? '').slice(0, max)
        act('Edit text', updateElement(elementId, path, text), `text:${elementId}:${path.join('.')}`)
      }}
    >
      {value}
    </span>
  )
}

function RichEditor({ elementId, path, value, rich }: EditableText) {
  const mode = rich === 'inline' ? 'inline' : 'block'
  const timer = useRef<number | undefined>(undefined)
  const lastSent = useRef(value)
  const max = limitFor(path, rich)
  const coalesce = `text:${elementId}:${path.join('.')}`
  const extensions = useMemo(
    () => [
      ...(mode === 'inline' ? [InlineDocument] : []),
      StarterKit.configure({
        ...(mode === 'inline' ? { document: false, bulletList: false, orderedList: false, listItem: false } : {}),
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: true, protocols: ['mailto', 'tel'], defaultProtocol: 'https' },
      }),
      TokenNode,
      CheckListAttribute,
      CharacterCount.configure({ limit: max }),
      Placeholder.configure({ placeholder: mode === 'inline' ? 'Write a heading' : 'Write something' }),
    ],
    [mode, max],
  )
  const commit = (text: string) => {
    window.clearTimeout(timer.current)
    if (text === lastSent.current) return
    lastSent.current = text
    act('Edit text', updateElement(elementId, path, text), coalesce)
  }
  const editor = useTiptap({
    extensions,
    content: richToJson(parseRichText(value), mode),
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: 'outline-none ring-indigo-400 focus:ring-2 rounded',
        role: 'textbox',
        'aria-label': 'Edit text',
        'aria-multiline': mode === 'block' ? 'true' : 'false',
      },
      handleKeyDown: (_view, event) => mode === 'inline' && event.key === 'Enter',
    },
    onUpdate: ({ editor: instance }) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => commit(serialize(instance.getJSON())), 400)
    },
    onBlur: ({ editor: instance }) => commit(serialize(instance.getJSON())),
  })
  useEffect(() => {
    if (!editor || editor.isFocused || value === lastSent.current) return
    lastSent.current = value
    editor.commands.setContent(richToJson(parseRichText(value), mode), { emitUpdate: false })
  }, [editor, value, mode])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const screens = useEditor(state => state.doc?.screens)
  const uniqueAnswers = useMemo(() => {
    const seen = new Set<string>()
    const out: { key: string; label: string }[] = []
    for (const screen of Object.values(screens ?? {}))
      for (const output of screenOutputs(screen)) {
        if (seen.has(output.key)) continue
        seen.add(output.key)
        out.push({ key: output.key, label: output.label })
      }
    return out
  }, [screens])
  if (!editor) return null
  const button = (label: string, active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded ${active ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'}`}
      style={{ color: active ? '#3730a3' : '#475569', minHeight: 0, minWidth: 0 }}
    >
      {icon}
    </button>
  )
  return (
    <span className="relative block" data-inline-editor="">
      <span
        className="absolute -top-[42px] left-0 z-20 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 font-sans shadow-md"
        style={{ fontSize: 14, lineHeight: 1 }}
      >
        {button('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={14} />)}
        {button(
          'Italic',
          editor.isActive('italic'),
          () => editor.chain().focus().toggleItalic().run(),
          <Italic size={14} />,
        )}
        {button(
          'Link',
          editor.isActive('link'),
          () => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run()
              return
            }
            const href = window.prompt('Link address', 'https://')
            if (href && /^(https?:\/\/|mailto:|tel:)/i.test(href)) editor.chain().focus().setLink({ href }).run()
          },
          <Link2 size={14} />,
        )}
        {mode === 'block'
          ? button(
              'Bulleted list',
              editor.isActive('bulletList'),
              () => editor.chain().focus().toggleBulletList().run(),
              <List size={14} />,
            )
          : null}
        {mode === 'block'
          ? button(
              'Numbered list',
              editor.isActive('orderedList'),
              () => editor.chain().focus().toggleOrderedList().run(),
              <ListOrdered size={14} />,
            )
          : null}
        <Popover
          trigger={
            <button
              type="button"
              aria-label="Insert a saved answer"
              title="Insert a saved answer"
              onMouseDown={event => event.preventDefault()}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100"
              style={{ color: '#475569', minHeight: 0, minWidth: 0 }}
            >
              <UserRound size={14} />
            </button>
          }
        >
          <p className="px-2 pb-1 text-xs text-slate-500">Insert a saved answer</p>
          {uniqueAnswers.length === 0 ? (
            <p className="px-2 py-1 text-sm text-slate-600">Add a question or form first.</p>
          ) : (
            uniqueAnswers.map(answer => (
              <button
                key={answer.key}
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertContent({ type: 'token', attrs: { name: answer.key, fallback: 'there' } })
                    .run()
                }
              >
                {answer.label}
              </button>
            ))
          )}
        </Popover>
      </span>
      <EditorContent editor={editor} />
    </span>
  )
}
