import * as React from 'react'
import { File, Image, Loader2, Upload, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import { fileNameFromUrl, looksLikeVideo, uploadFile } from '@/lib/files'

interface FileUploaderProps {
  value?: string
  onChange: (url: string) => void
  accept?: string
  maxSizeMB?: number
  kind?: 'image' | 'video' | 'auto'
  className?: string
}

export const FileUploader: React.FC<FileUploaderProps> = ({ value, onChange, accept, maxSizeMB = 200, kind = 'auto', className }) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [progress, setProgress] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const KindIcon = kind === 'image' ? Image : kind === 'video' ? Video : File
  const resolvedAccept = accept || (kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : 'image/*,video/*')
  const isVideoValue = !!value && (kind === 'video' || (kind === 'auto' && looksLikeVideo(value)))

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large, max ${maxSizeMB}MB`)
      return
    }
    try {
      setProgress(0)
      const url = await uploadFile(file, setProgress)
      onChange(url)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Upload failed')
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (value) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="relative overflow-hidden rounded-md border bg-muted/30">
          {isVideoValue ? (
            <video src={value} controls className="h-28 w-full bg-black object-contain" />
          ) : (
            <img src={value} alt="" className="h-28 w-full object-cover" />
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
            <KindIcon className="h-3 w-3 text-white" />
            <span className="max-w-40 truncate text-[10px] text-white">{fileNameFromUrl(value)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
            <Upload className="h-3 w-3" /> Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')} disabled={progress !== null} aria-label="Remove file">
            <X className="h-3 w-3" /> Remove
          </Button>
        </div>
        {progress !== null && <Progress value={progress} />}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input ref={inputRef} type="file" accept={resolvedAccept} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
        disabled={progress !== null}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-5 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-input bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        {progress !== null ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Upload className="h-4 w-4" />
            <KindIcon className="h-4 w-4" />
          </span>
        )}
        <span className="text-xs font-medium">{progress !== null ? `Uploading ${progress}%` : 'Click to upload or drag and drop'}</span>
        <span className="text-[10px] text-muted-foreground">{resolvedAccept} · max {maxSizeMB}MB</span>
      </button>
      {progress !== null && <Progress value={progress} />}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept={resolvedAccept} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}

export default FileUploader
