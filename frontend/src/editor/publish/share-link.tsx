import { Copy, Download, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/Button'

export function useQr(url: string | undefined, width = 220): string | null {
  const [data, setData] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width, errorCorrectionLevel: 'M' })
      .then(value => !cancelled && setData(value))
      .catch(() => setData(null))
    return () => {
      cancelled = true
    }
  }, [url, width])
  return url ? data : null
}

export async function downloadQrSvg(url: string, filename: string): Promise<void> {
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1 })
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  URL.revokeObjectURL(href)
}

export function copy(text: string, message = 'Link copied'): void {
  void navigator.clipboard
    .writeText(text)
    .then(() => toast.success(message))
    .catch(() => toast.error('Copy failed. Select the link and copy it.'))
}

export function LinkCard({ url, slug }: { url: string; slug: string }) {
  const qr = useQr(url)
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 p-3">
      {qr ? (
        <img src={qr} alt="QR code for your link" width={112} height={112} className="rounded" />
      ) : (
        <div className="h-28 w-28 rounded bg-slate-100" />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate font-mono text-sm text-slate-800">{url}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => copy(url)}>
            <Copy size={13} /> Copy link
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium hover:bg-slate-50"
          >
            <ExternalLink size={13} /> Open
          </a>
          {qr ? (
            <a
              href={qr}
              download={`${slug}-qr.png`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium hover:bg-slate-50"
            >
              <Download size={13} /> QR PNG
            </a>
          ) : null}
          <Button size="sm" onClick={() => void downloadQrSvg(url, `${slug}-qr.svg`)}>
            <Download size={13} /> QR SVG
          </Button>
        </div>
      </div>
    </div>
  )
}
