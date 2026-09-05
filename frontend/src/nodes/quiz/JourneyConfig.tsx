import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quizSchema } from './schema'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { JourneyConfigProps } from '../_core/config'
import type { z } from 'zod'
type Config = z.infer<typeof quizSchema>
export const QuizJourneyConfig: React.FC<JourneyConfigProps<Config>> = ({ config, onChange }) => {
  const form = useForm<any>({ resolver: zodResolver(quizSchema as any), defaultValues: config })
  const v = form.watch()
  React.useEffect(() => { if (config) form.reset(config) }, [JSON.stringify(config)])
  React.useEffect(() => { onChange(form.getValues()) }, [JSON.stringify(v)])
  const options = form.watch('options') || []
  return <div className="space-y-3"><div className="space-y-1"><Label>Question</Label><Textarea {...form.register('question')} placeholder="Your question" /></div><div className="space-y-1"><Label>Type</Label><Select value={form.watch('type')} onValueChange={val => form.setValue('type', val as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="multiple">Multiple</SelectItem><SelectItem value="true_false">True/false</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Options</Label>{options.map((opt:any,i:number)=><div key={i} className="flex gap-1"><Input value={opt.label} onChange={e=>{ const n=[...options]; n[i]={...n[i], label:e.target.value}; form.setValue('options', n as any)}} className="flex-1" placeholder="Option label" /><Button type="button" variant="ghost" size="sm" onClick={()=>{ const n=options.filter((_:any,idx:number)=>idx!==i); form.setValue('options', n as any)}}>✕</Button></div>)}<Button type="button" variant="outline" size="sm" onClick={()=>form.setValue('options', [...options, { id: `o${Date.now()}`, label: 'New option' }] as any)}>Add option</Button></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('allowSkip')} /> Allow skip</label><div className="space-y-1"><Label>Skip label</Label><Input {...form.register('skipLabel')} /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...form.register('showResult')} /> Show result</label><Button type="button" variant="outline" size="sm" onClick={() => onChange({ question: '', options: [], type: 'mcq' } as any)}>Reset</Button></div>
}
export default QuizJourneyConfig
