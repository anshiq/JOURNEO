export type FontId =
  | 'inter'
  | 'source-sans-3'
  | 'playfair-display'
  | 'space-grotesk'
  | 'nunito'
  | 'cormorant-garamond'
  | 'lato'
  | 'archivo'
  | 'ibm-plex-sans'
  | 'poppins'
  | 'open-sans'
  | 'dm-sans'

export type PairingId = 'classic' | 'editorial' | 'modern' | 'friendly' | 'elegant' | 'bold' | 'tech' | 'rounded'

interface FontFile {
  url: string
  weight: string
}

export interface FontDefinition {
  family: string
  label: string
  files: FontFile[]
  fallback: string
}

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif'
const variable = (file: string): FontFile[] => [{ url: `/fonts/${file}-latin-wght-normal.woff2`, weight: '100 900' }]
const fixed = (file: string): FontFile[] => [
  { url: `/fonts/${file}-latin-400-normal.woff2`, weight: '400' },
  { url: `/fonts/${file}-latin-700-normal.woff2`, weight: '700' },
]

export const FONTS: Record<FontId, FontDefinition> = {
  inter: { family: 'Inter Variable', label: 'Inter', files: variable('inter'), fallback: SANS },
  'source-sans-3': {
    family: 'Source Sans 3 Variable',
    label: 'Source Sans',
    files: variable('source-sans-3'),
    fallback: SANS,
  },
  'playfair-display': {
    family: 'Playfair Display Variable',
    label: 'Playfair Display',
    files: variable('playfair-display'),
    fallback: SERIF,
  },
  'space-grotesk': {
    family: 'Space Grotesk Variable',
    label: 'Space Grotesk',
    files: variable('space-grotesk'),
    fallback: SANS,
  },
  nunito: { family: 'Nunito Variable', label: 'Nunito', files: variable('nunito'), fallback: SANS },
  'cormorant-garamond': {
    family: 'Cormorant Garamond Variable',
    label: 'Cormorant Garamond',
    files: variable('cormorant-garamond'),
    fallback: SERIF,
  },
  lato: { family: 'Lato', label: 'Lato', files: fixed('lato'), fallback: SANS },
  archivo: { family: 'Archivo Variable', label: 'Archivo', files: variable('archivo'), fallback: SANS },
  'ibm-plex-sans': {
    family: 'IBM Plex Sans Variable',
    label: 'IBM Plex Sans',
    files: variable('ibm-plex-sans'),
    fallback: SANS,
  },
  poppins: { family: 'Poppins', label: 'Poppins', files: fixed('poppins'), fallback: SANS },
  'open-sans': { family: 'Open Sans Variable', label: 'Open Sans', files: variable('open-sans'), fallback: SANS },
  'dm-sans': { family: 'DM Sans Variable', label: 'DM Sans', files: variable('dm-sans'), fallback: SANS },
}

export const PAIRINGS: Record<PairingId, { label: string; heading: FontId; body: FontId }> = {
  classic: { label: 'Classic', heading: 'inter', body: 'inter' },
  editorial: { label: 'Editorial', heading: 'playfair-display', body: 'source-sans-3' },
  modern: { label: 'Modern', heading: 'space-grotesk', body: 'inter' },
  friendly: { label: 'Friendly', heading: 'nunito', body: 'nunito' },
  elegant: { label: 'Elegant', heading: 'cormorant-garamond', body: 'lato' },
  bold: { label: 'Bold', heading: 'archivo', body: 'dm-sans' },
  tech: { label: 'Tech', heading: 'ibm-plex-sans', body: 'ibm-plex-sans' },
  rounded: { label: 'Rounded', heading: 'poppins', body: 'open-sans' },
}

export function resolveFonts(fonts: { pairing?: string; heading?: string | null; body?: string | null } | undefined): {
  heading: FontId
  body: FontId
} {
  const pairing = PAIRINGS[(fonts?.pairing ?? 'classic') as PairingId] ?? PAIRINGS.classic
  const heading = (fonts?.heading && fonts.heading in FONTS ? fonts.heading : pairing.heading) as FontId
  const body = (fonts?.body && fonts.body in FONTS ? fonts.body : pairing.body) as FontId
  return { heading, body }
}

export function fontStack(id: FontId): string {
  const font = FONTS[id]
  return `"${font.family}", ${font.fallback}`
}

const loaded = new Set<string>()

export function loadFonts(ids: FontId[]): void {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return
  for (const id of ids) {
    const font = FONTS[id]
    for (const file of font.files) {
      const key = `${font.family}:${file.weight}`
      if (loaded.has(key)) continue
      loaded.add(key)
      const face = new FontFace(font.family, `url(${file.url}) format("woff2")`, {
        weight: file.weight,
        display: 'swap',
      })
      document.fonts.add(face)
      void face.load().catch(() => loaded.delete(key))
    }
  }
}

export function preloadUrls(ids: FontId[]): string[] {
  return [...new Set(ids.flatMap(id => FONTS[id].files.map(f => f.url)))]
}
