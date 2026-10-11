import type { Theme } from '@journey/model/types'

export interface ThemePreset {
  id: string
  label: string
  theme: Theme
}

export const PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    theme: {
      preset: 'classic',
      colors: { primary: '#4f46e5', accent: '#f97316', background: '#ffffff', surface: '#f8fafc', text: '#111827' },
      fonts: { pairing: 'classic' },
      radius: 'md',
      buttons: { style: 'solid', case: 'normal' },
    },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    theme: {
      preset: 'editorial',
      colors: { primary: '#1f2937', accent: '#b45309', background: '#fbf8f3', surface: '#ffffff', text: '#1c1917' },
      fonts: { pairing: 'editorial' },
      radius: 'sm',
      buttons: { style: 'solid', case: 'normal' },
    },
  },
  {
    id: 'bold',
    label: 'Bold',
    theme: {
      preset: 'bold',
      colors: { primary: '#e11d48', accent: '#facc15', background: '#fff7ed', surface: '#ffffff', text: '#18181b' },
      fonts: { pairing: 'bold' },
      radius: 'lg',
      typeScale: 'large',
      buttons: { style: 'solid', case: 'upper' },
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    theme: {
      preset: 'minimal',
      colors: { primary: '#111827', accent: '#6b7280', background: '#ffffff', surface: '#f9fafb', text: '#111827' },
      fonts: { pairing: 'modern' },
      radius: 'none',
      buttons: { style: 'outline', case: 'normal' },
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    theme: {
      preset: 'midnight',
      colors: { primary: '#a78bfa', accent: '#22d3ee', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9' },
      fonts: { pairing: 'tech' },
      radius: 'md',
      buttons: { style: 'solid', case: 'normal' },
    },
  },
]
