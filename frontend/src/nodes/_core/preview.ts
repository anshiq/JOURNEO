import { styleSchema, type NodeStyle } from './types'
import type { ThemeConfig } from './types'
export const defaultTheme: ThemeConfig = { primary: '#4f46e5', accent: '#f97316', surface: '#ffffff', foreground: '#111827', font: 'Inter', radius: 16, cta: 'Continue' }
export const editorialTheme: ThemeConfig = { primary: '#000000', accent: '#E60000', surface: '#FFFFFF', foreground: '#111111', font: 'Bodoni Moda', radius: 0, cta: 'Continue' }
export const themePresets: Record<string, ThemeConfig> = { Classic: { ...defaultTheme }, Editorial: { ...editorialTheme } }
export function getTheme(config: any): ThemeConfig {
  return config?.theme || defaultTheme
}
export function getNodeStyle(config: any): NodeStyle {
  if (!config?.style) return {}
  try { return styleSchema.parse(config.style) as NodeStyle } catch { return config.style as NodeStyle }
}
export function applyStyle(style: NodeStyle): React.CSSProperties {
  const result: Record<string, any> = {}
  if (style.fontFamily) result.fontFamily = style.fontFamily
  if (style.fontSize) result.fontSize = style.fontSize
  if (style.fontWeight) result.fontWeight = style.fontWeight
  if (style.lineHeight) result.lineHeight = style.lineHeight
  if (style.letterSpacing) result.letterSpacing = style.letterSpacing
  if (style.textAlign) result.textAlign = style.textAlign
  if (style.textDecoration) result.textDecoration = style.textDecoration
  if (style.textTransform) result.textTransform = style.textTransform
  if (style.backgroundColor) result.backgroundColor = style.backgroundColor
  if (style.backgroundImage) result.backgroundImage = style.backgroundImage
  if (style.backgroundSize) result.backgroundSize = style.backgroundSize
  if (style.backgroundPosition) result.backgroundPosition = style.backgroundPosition
  if (style.foregroundColor) result.color = style.foregroundColor
  if (style.borderColor) result.borderColor = style.borderColor
  if (style.borderWidth) result.borderWidth = style.borderWidth
  if (style.borderStyle) result.borderStyle = style.borderStyle
  if (style.borderRadius) result.borderRadius = style.borderRadius
  if (style.margin) result.margin = style.margin
  if (style.marginTop) result.marginTop = style.marginTop
  if (style.marginRight) result.marginRight = style.marginRight
  if (style.marginBottom) result.marginBottom = style.marginBottom
  if (style.marginLeft) result.marginLeft = style.marginLeft
  if (style.padding) result.padding = style.padding
  if (style.paddingTop) result.paddingTop = style.paddingTop
  if (style.paddingRight) result.paddingRight = style.paddingRight
  if (style.paddingBottom) result.paddingBottom = style.paddingBottom
  if (style.paddingLeft) result.paddingLeft = style.paddingLeft
  if (style.gap) result.gap = style.gap
  if (style.width) result.width = style.width
  if (style.height) result.height = style.height
  if (style.minWidth) result.minWidth = style.minWidth
  if (style.maxWidth) result.maxWidth = style.maxWidth
  if (style.minHeight) result.minHeight = style.minHeight
  if (style.maxHeight) result.maxHeight = style.maxHeight
  if (style.display) result.display = style.display
  if (style.flexDirection) result.flexDirection = style.flexDirection
  if (style.flexWrap) result.flexWrap = style.flexWrap
  if (style.justifyContent) result.justifyContent = style.justifyContent
  if (style.alignItems) result.alignItems = style.alignItems
  if (style.flexGrow) result.flexGrow = style.flexGrow
  if (style.flexShrink) result.flexShrink = style.flexShrink
  if (style.order) result.order = style.order
  if (style.gridTemplateColumns) result.gridTemplateColumns = style.gridTemplateColumns
  if (style.gridColumn) result.gridColumn = style.gridColumn
  if (style.gridRow) result.gridRow = style.gridRow
  if (style.position) result.position = style.position
  if (style.top) result.top = style.top
  if (style.right) result.right = style.right
  if (style.bottom) result.bottom = style.bottom
  if (style.left) result.left = style.left
  if (style.zIndex) result.zIndex = style.zIndex
  if (style.overflow) result.overflow = style.overflow
  if (style.opacity !== undefined) result.opacity = style.opacity
  if (style.boxShadow) result.boxShadow = style.boxShadow
  if (style.transitionProperty) result.transitionProperty = style.transitionProperty
  if (style.transitionDuration) result.transitionDuration = style.transitionDuration
  if (style.transform) result.transform = style.transform
  if (style.transformOrigin) result.transformOrigin = style.transformOrigin
  if (style.cursor) result.cursor = style.cursor
  if (style.objectFit) result.objectFit = style.objectFit
  return result as React.CSSProperties
}
export function youtubeEmbedUrl(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : url
}
