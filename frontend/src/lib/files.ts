import { journeyApi } from './api'

export interface PresignResponse {
  uploadUrl: string
  publicUrl: string
  key: string
  bucket: string
  expiresIn: number
}

export async function requestPresignedUrl(file: File): Promise<PresignResponse> {
  const { data } = await journeyApi.post('/api/files/presign', {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
  })
  return data as PresignResponse
}

export function uploadToSignedUrl(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })
}

export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const presigned = await requestPresignedUrl(file)
  await uploadToSignedUrl(presigned.uploadUrl, file, onProgress)
  return presigned.publicUrl
}

export function looksLikeVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url)
}

export function fileNameFromUrl(url: string): string {
  try {
    const clean = url.split('?')[0]
    const last = clean.split('/').pop() || clean
    const dash = last.indexOf('-')
    return dash > 0 && last.startsWith('uploads') === false ? last.slice(dash + 1) : last
  } catch {
    return url
  }
}
