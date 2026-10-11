import { stepName } from '@journey/summary'
import { AlertTriangle, CircleAlert } from 'lucide-react'
import type { Issue } from '../queries/types'
import { useEditor } from '../store'
import { findElement } from '../store/commands'
import { Button } from '../ui/Button'
import { Empty } from '../ui/Empty'
import { applyFix, issueKey } from './fix'

export function useAllIssues(): Issue[] {
  const issues = useEditor(state => state.issues)
  const client = useEditor(state => state.clientIssues)
  return [...issues, ...client]
}

function groupName(issue: Issue): string {
  const doc = useEditor.getState().doc
  if (!doc) return 'Journey'
  const t = issue.target
  if (t.kind === 'theme') return 'Design'
  if (t.kind === 'settings') return 'Settings'
  if (t.kind === 'assistant') return 'Visitor chat'
  const screenId = t.screenId ?? (t.kind === 'element' || t.kind === 'item' ? findElement(doc, t.id)?.screen.id : t.id)
  return screenId ? stepName(doc, screenId) : 'Journey'
}

export function IssuesList({ issues, onFix, compact }: { issues: Issue[]; onFix?: () => void; compact?: boolean }) {
  const groups = new Map<string, Issue[]>()
  for (const issue of issues) {
    const name = groupName(issue)
    groups.set(name, [...(groups.get(name) ?? []), issue])
  }
  if (issues.length === 0) return <Empty title="All set, ready to publish">Nothing needs fixing right now.</Empty>
  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([name, list]) => (
        <div key={name}>
          <p className="pb-1 text-xs font-semibold text-slate-500">{name}</p>
          <ul className="space-y-1">
            {list.map(issue => (
              <li
                key={issueKey(issue)}
                className="flex items-start gap-2 rounded-md border border-slate-200 px-2 py-1.5"
              >
                {issue.severity === 'error' ? (
                  <CircleAlert size={15} className="mt-0.5 shrink-0 text-rose-600" />
                ) : (
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                )}
                <span className="min-w-0 flex-1 text-sm text-slate-800">{issue.message}</span>
                <Button
                  size="sm"
                  variant={compact ? 'ghost' : 'secondary'}
                  onClick={() => {
                    applyFix(issue)
                    onFix?.()
                  }}
                >
                  Fix
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
