import { isProblem } from '@shared/api/problem'
import { LIMITS } from '@shared/limits.gen'
import { cn } from '@shared/ui/cn'
import { ImagePlus, Link2, Loader2, Search, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { importImage, uploadImage, useStockSearch } from '../../queries/library'
import type { UploadedImage } from '../../queries/types'
import { Button } from '../../ui/Button'
import { Popover, PopoverClose } from '../../ui/Popover'

export interface PickedImage {
  src: string
  srcset?: string | null
  width?: number | null
  height?: number | null
  dominantColor?: string | null
  attribution?: string | null
}

function fromUpload(image: UploadedImage, attribution?: string | null): PickedImage {
  return {
    src: image.src,
    srcset: image.srcset || null,
    width: image.width,
    height: image.height,
    dominantColor: image.dominantColor,
    ...(attribution ? { attribution } : {}),
  }
}

export async function uploadFile(file: File): Promise<PickedImage | null> {
  try {
    return fromUpload(await uploadImage(file))
  } catch (error) {
    toast.error(isProblem(error) ? error.problem.detail : 'Upload failed. Try another image.')
    return null
  }
}

export function ImageField({
  label,
  src,
  onPick,
  onClear,
  field,
  compact,
}: {
  label: string
  src: string | null | undefined
  onPick: (image: PickedImage) => void
  onClear?: () => void
  field?: string
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const handle = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    const picked = await uploadFile(file)
    setBusy(false)
    if (picked) onPick(picked)
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div
        role="group"
        aria-label={`${label} drop area`}
        onDragOver={event => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          void handle(event.dataTransfer.files[0])
        }}
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-md border border-dashed bg-slate-50',
          compact ? 'h-16' : 'h-28',
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300',
        )}
      >
        {busy ? (
          <Loader2 className="animate-spin text-slate-500" size={20} />
        ) : src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <ImagePlus size={14} /> Drop an image here
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        aria-label={`Upload ${label}`}
        onChange={event => {
          void handle(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <div className="flex flex-wrap gap-1" data-field={field}>
        <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <Upload size={13} /> Upload
        </Button>
        <StockPicker onPick={onPick} setBusy={setBusy} />
        <LinkPicker onPick={onPick} />
        {src && onClear ? (
          <Button size="sm" variant="ghost" onClick={onClear}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function StockPicker({ onPick, setBusy }: { onPick: (image: PickedImage) => void; setBusy: (busy: boolean) => void }) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const results = useStockSearch(submitted)
  return (
    <Popover
      className="w-96"
      trigger={
        <Button size="sm">
          <Search size={13} /> Library
        </Button>
      }
    >
      <form
        className="flex gap-1"
        onSubmit={event => {
          event.preventDefault()
          setSubmitted(query)
        }}
      >
        <input
          type="search"
          maxLength={LIMITS.stock_query}
          value={query}
          placeholder="Search free photos"
          aria-label="Search free photos"
          onChange={event => setQuery(event.target.value)}
          className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-sm"
        />
        <Button size="sm" type="submit">
          Search
        </Button>
      </form>
      {results.isFetching ? <p className="p-2 text-xs text-slate-500">Searching…</p> : null}
      {results.data && results.data.length === 0 ? (
        <p className="p-2 text-xs text-slate-500">No photos found.</p>
      ) : null}
      <div className="mt-2 grid grid-cols-3 gap-1">
        {(results.data ?? []).map(item => (
          <PopoverClose asChild key={item.fullUrl}>
            <button
              type="button"
              title={item.title ?? ''}
              className="aspect-square overflow-hidden rounded bg-slate-100"
              onClick={async () => {
                setBusy(true)
                try {
                  const image = await importImage(item.fullUrl)
                  const credit = [item.title, item.creator ? `by ${item.creator}` : null, item.license]
                    .filter(Boolean)
                    .join(' · ')
                    .slice(0, LIMITS.attribution)
                  onPick(fromUpload(image, credit))
                } catch {
                  toast.error('We could not use that photo. Try another one.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <img src={item.thumbUrl} alt={item.title ?? ''} loading="lazy" className="h-full w-full object-cover" />
            </button>
          </PopoverClose>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Free photos from Openverse. Credits are saved with the image.</p>
    </Popover>
  )
}

function LinkPicker({ onPick }: { onPick: (image: PickedImage) => void }) {
  const [url, setUrl] = useState('')
  return (
    <Popover
      trigger={
        <Button size="sm">
          <Link2 size={13} /> Link
        </Button>
      }
    >
      <form
        className="space-y-2"
        onSubmit={event => {
          event.preventDefault()
          if (/^https:\/\//.test(url)) onPick({ src: url })
          else toast.error('Use an image address that starts with https://')
        }}
      >
        <input
          type="url"
          maxLength={LIMITS.url}
          value={url}
          placeholder="https://"
          aria-label="Image address"
          onChange={event => setUrl(event.target.value)}
          className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
        <PopoverClose asChild>
          <Button size="sm" type="submit" variant="primary">
            Use image
          </Button>
        </PopoverClose>
      </form>
    </Popover>
  )
}
