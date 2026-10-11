const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isHex(value: string): boolean {
  return HEX.test(value)
}

function expand(hex: string): string {
  const h = hex.replace('#', '')
  return h.length === 3
    ? h
        .split('')
        .map(c => c + c)
        .join('')
    : h
}

export function rgb(hex: string): [number, number, number] {
  const h = expand(hex)
  return [Number.parseInt(h.slice(0, 2), 16), Number.parseInt(h.slice(2, 4), 16), Number.parseInt(h.slice(4, 6), 16)]
}

export function luminance(hex: string): number {
  const linear = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = rgb(hex)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function onColor(background: string): string {
  return contrast('#111827', background) >= contrast('#ffffff', background) ? '#111827' : '#ffffff'
}

export function mix(a: string, b: string, weight: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const channel = (x: number, y: number) =>
    Math.round(x * (1 - weight) + y * weight)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`
}
