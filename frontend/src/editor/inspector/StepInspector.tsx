import { addRule, deleteRule, deleteStep, moveRule, updateRule, updateStep } from '@journey/ops/index'
import { stepById } from '@journey/ports'
import { LIMITS } from '@shared/limits.gen'
import { Trash2 } from 'lucide-react'
import { useEditor } from '../store'
import { act } from '../store/commands'
import { Button } from '../ui/Button'
import { Section } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { NumberControl, TextControl } from './controls'
import { answerSources, ConditionBuilder, defaultLeaf } from './widgets/ConditionBuilder'
import { DestinationPicker } from './widgets/DestinationPicker'
import { ListEditor, RowInput } from './widgets/ListEditor'

export function StepInspector({ stepId }: { stepId: string }) {
  const doc = useEditor(state => state.doc)
  const step = doc ? stepById(doc, stepId) : undefined
  if (!doc || !step) return null
  if (step.kind === 'start') {
    return (
      <div>
        <Header title="Start" subtitle="Where visitors begin" />
        <Section title="First screen">
          <DestinationPicker stepId={stepId} port="next" fallback={null} allowCondition />
        </Section>
      </div>
    )
  }
  if (step.kind === 'redirect') {
    return (
      <div>
        <Header
          title="Redirect"
          subtitle="Sends visitors to a website"
          onDelete={() => act('Delete redirect', deleteStep(stepId))}
        />
        <Section title="Destination">
          <TextControl
            label="Website address"
            field="url"
            type="url"
            max={LIMITS.url}
            value={step.url}
            onChange={value => act('Edit redirect', updateStep(stepId, ['url'], value), `redirect:${stepId}:url`)}
          />
          <Switch
            label="Pass link tracking"
            hint="Forwards the campaign source and other link details"
            checked={step.passParams ?? true}
            onChange={v => act('Edit redirect', updateStep(stepId, ['passParams'], v))}
          />
          <NumberControl
            label="Wait before redirecting (seconds)"
            min={0}
            max={10}
            value={Math.round((step.delayMs ?? 0) / 1000)}
            onChange={value =>
              act('Edit redirect', updateStep(stepId, ['delayMs'], (value ?? 0) * 1000), `redirect:${stepId}:delay`)
            }
          />
        </Section>
      </div>
    )
  }
  if (step.kind !== 'condition') return null
  const rules = step.rules ?? []
  const first = answerSources(doc)[0]
  return (
    <div className="h-full overflow-y-auto">
      <Header
        title="Condition"
        subtitle="Checked top to bottom; the first matching path wins"
        onDelete={() => act('Delete condition', deleteStep(stepId))}
      />
      <Section title="Name">
        <TextControl
          label="Condition name"
          max={LIMITS.rule_label}
          value={step.label}
          placeholder="Condition"
          onChange={value =>
            act('Rename condition', updateStep(stepId, ['label'], value || null), `cond:${stepId}:label`)
          }
        />
      </Section>
      <Section title="Paths">
        <ListEditor
          label="Paths"
          addLabel="Add path"
          items={rules}
          max={LIMITS.max_rules}
          min={1}
          onAdd={() =>
            first && act('Add path', addRule(stepId, { label: `Path ${rules.length + 1}`, when: defaultLeaf(first) }))
          }
          onMove={(from, to) => act('Reorder paths', moveRule(stepId, from, to))}
          onDelete={rule => act('Delete path', deleteRule(stepId, rule.id))}
          renderRow={rule => (
            <>
              <RowInput
                label="Path name"
                field={`rule:${rule.id}`}
                max={LIMITS.rule_label}
                value={rule.label}
                onChange={value =>
                  act('Rename path', updateRule(stepId, rule.id, ['label'], value), `rule:${rule.id}:label`)
                }
              />
              <ConditionBuilder
                doc={doc}
                value={rule.when}
                onChange={value =>
                  value && act('Edit path', updateRule(stepId, rule.id, ['when'], value), `rule:${rule.id}:when`)
                }
              />
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Then go to</p>
                <DestinationPicker stepId={stepId} port={`rule:${rule.id}`} fallback={null} />
              </div>
            </>
          )}
        />
      </Section>
      <Section title="Otherwise">
        <p className="text-xs text-slate-600">When no path matches</p>
        <DestinationPicker stepId={stepId} port="else" fallback={null} />
      </Section>
    </div>
  )
}

function Header({ title, subtitle, onDelete }: { title: string; subtitle: string; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {onDelete ? (
        <Button size="icon" variant="ghost" aria-label={`Delete ${title.toLowerCase()}`} onClick={onDelete}>
          <Trash2 size={15} />
        </Button>
      ) : null}
    </div>
  )
}
