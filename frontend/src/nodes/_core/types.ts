import * as React from 'react'
import { z } from 'zod'
const typographySchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  textDecoration: z.string().optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  whiteSpace: z.enum(['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line']).optional(),
})
const colorsSchema = z.object({
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundSize: z.string().optional(),
  foregroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  shadowColor: z.string().optional(),
})
const spacingSchema = z.object({
  margin: z.string().optional(),
  marginTop: z.string().optional(),
  marginRight: z.string().optional(),
  marginBottom: z.string().optional(),
  marginLeft: z.string().optional(),
  padding: z.string().optional(),
  paddingTop: z.string().optional(),
  paddingRight: z.string().optional(),
  paddingBottom: z.string().optional(),
  paddingLeft: z.string().optional(),
  gap: z.string().optional(),
})
const borderSchema = z.object({
  borderWidth: z.string().optional(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'double', 'none']).optional(),
  borderRadius: z.string().optional(),
})
const sizeSchema = z.object({
  width: z.string().optional(),
  minWidth: z.string().optional(),
  maxWidth: z.string().optional(),
  height: z.string().optional(),
  minHeight: z.string().optional(),
  maxHeight: z.string().optional(),
})
const layoutSchema = z.object({
  display: z.enum(['flex', 'block', 'inline', 'inline-block', 'grid', 'none']).optional(),
  flexDirection: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
  flexWrap: z.enum(['nowrap', 'wrap', 'wrap-reverse']).optional(),
  justifyContent: z.enum(['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']).optional(),
  alignItems: z.enum(['stretch', 'flex-start', 'flex-end', 'center', 'baseline']).optional(),
  flexGrow: z.number().optional(),
  flexShrink: z.number().optional(),
  gridTemplateColumns: z.string().optional(),
  order: z.number().optional(),
  gridColumn: z.string().optional(),
  gridRow: z.string().optional(),
  position: z.enum(['static', 'relative', 'absolute', 'fixed', 'sticky']).optional(),
  top: z.string().optional(),
  right: z.string().optional(),
  bottom: z.string().optional(),
  left: z.string().optional(),
  zIndex: z.number().optional(),
  overflow: z.string().optional(),
  transitionProperty: z.string().optional(),
  transitionDuration: z.string().optional(),
  transformOrigin: z.string().optional(),
  backgroundPosition: z.string().optional(),
})
const effectsSchema = z.object({
  opacity: z.number().min(0).max(1).optional(),
  boxShadow: z.string().optional(),
  transform: z.string().optional(),
  cursor: z.string().optional(),
  objectFit: z.enum(['cover', 'contain', 'fill', 'none']).optional(),
})
export const styleSchema = z.object({
  ...typographySchema.shape,
  ...colorsSchema.shape,
  ...spacingSchema.shape,
  ...borderSchema.shape,
  ...sizeSchema.shape,
  ...layoutSchema.shape,
  ...effectsSchema.shape,
})
export type NodeStyle = z.infer<typeof styleSchema>
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
export type ResponsiveOverride<T> = { mobile?: Partial<T>; tablet?: Partial<T>; desktop?: Partial<T> }
export const MAX_TIMEOUT_SECONDS = 86400
export const nodeBlockSchema = z.object({
  blockKey: z.string().regex(/^[a-zA-Z0-9_]{1,40}$/).optional(),
  blockRequired: z.boolean().optional(),
  blockOwnsExit: z.boolean().optional(),
  blockSpan: z.number().int().min(1).max(12).optional(),
  blockVisibleWhen: z.object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'contains', 'gt', 'lt', 'gte', 'lte']),
    value: z.any(),
  }).optional(),
})
export type NodeBlock = z.infer<typeof nodeBlockSchema>
export type NodeType = string
export interface ThemeConfig { primary: string; accent: string; surface: string; foreground: string; font: string; radius: number; cta: string }
export interface NodeDefinition<C = any> {
  type: string
  category: 'flow' | 'content' | 'form' | 'layout' | 'display' | 'interactive'
  icon: string
  accent: string
  schema: z.ZodTypeAny
  defaultConfig: C
  handles?: { inputs: number; outputs: string[] }
  renderable?: boolean
  valueType?: boolean
  canOwnExit?: boolean
  exitHandles?: string[]
  Device?: React.FC<any>
  JourneyConfig?: React.FC<any>
  StyleConfig?: React.FC<any>
}
