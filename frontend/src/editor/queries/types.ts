import type { JourneyDoc } from '@journey/model/types'

export type CampaignStatus = 'draft' | 'live' | 'live_changes' | 'paused' | 'ended'
export type Goal = 'leads' | 'recommend' | 'giveaway' | 'event' | 'feedback' | 'offer' | 'waitlist'

export interface CampaignSummary {
  id: string
  name: string
  slug: string
  brief: string
  goal: Goal | null
  audience?: string | null
  status?: CampaignStatus
  views?: number
  leads?: number
  conversion?: number
  publicUrl?: string
  previewUrl?: string
  createdAt?: string
  updatedAt: string
}

export interface IssueTarget {
  kind: string
  id: string
  screenId?: string
  itemId?: string
  field?: string
}

export interface Issue {
  code: string
  severity: 'error' | 'warning'
  message: string
  target: IssueTarget
  fix?: { kind: string }
  client?: boolean
}

export interface Ended {
  kind: 'message' | 'redirect'
  message?: string | null
  url?: string | null
}

export interface Ops {
  paused: boolean
  endsAt: string | null
  ended: Ended | null
  leadsWebhook: { url: string; enabled: boolean } | null
}

export interface EditorStateData {
  dismissedIssues?: string[]
  checklist?: Record<string, boolean>
  coachmarks?: Record<string, boolean>
}

export interface Workspace {
  journeyId: string
  status: CampaignStatus
  draft: { doc: JourneyDoc; revision: number; hash: string }
  live: { versionNo: number; versionId: string; publishedAt: string; hash: string } | null
  ops: Ops
  editorState: EditorStateData | null
  migration: { issues: unknown[] } | null
}

export interface VersionRow {
  versionNo: number
  publishedAt: string
  hash: string
  notes: string | null
  live: boolean
  migrationIssues: number
}

export interface CheckpointRow {
  id: string
  revision: number
  reason: string
  createdAt: string
}

export interface TemplateItem {
  id: string
  name: string
  goal: Goal | null
  description?: string
  checklist?: string[]
  doc: JourneyDoc
  source: 'builtin' | 'user'
}

export interface RecipeItem {
  id: string
  name: string
  category?: string
  layout?: unknown
  elements?: { type: string; props: Record<string, unknown> }[]
  [key: string]: unknown
}

export interface PresetItem {
  id: string
  name: string
  category: string
  element: { type: string; props: Record<string, unknown>; [key: string]: unknown }
}

export interface UploadedImage {
  key: string
  src: string
  srcset: string
  width: number
  height: number
  dominantColor: string | null
}

export interface StockImage {
  thumbUrl: string
  fullUrl: string
  license: string
  creator: string | null
  attributionUrl: string | null
  title: string | null
}

export interface Lead {
  id: string
  createdAt: string
  answers: Record<string, unknown>
  labels: Record<string, unknown>
  consent: unknown
  utm: Record<string, string>
  test: boolean
}

export interface WebhookStatus {
  delivered: boolean
  statusCode: number | null
  error: string | null
  at: string
}

export interface LeadsPage {
  items: Lead[]
  nextCursor: string | null
  webhook: WebhookStatus | null
}

export interface Results {
  range: string
  sessions: number
  completed: number
  abandoned: number
  completion: number
  devices: Record<string, number>
  funnel: { stepId: string; label: string; visitors: number; exits: number }[]
  answers: Record<string, { label: string; type: string; values: Record<string, number> }>
}

export interface KnowledgeSource {
  id: string
  kind: 'url' | 'qa' | 'pdf'
  title: string | null
  url: string | null
  status: 'pending' | 'ready' | 'failed'
  error: string | null
  createdAt: string
}

export interface ChatAnswer {
  answer: string
  citations: { title: string; url: string | null; snippet?: string }[]
  fallback: boolean
}
