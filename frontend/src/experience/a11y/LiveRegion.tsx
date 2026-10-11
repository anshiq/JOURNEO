import { srOnly } from '../styles/root.css'

export function LiveRegion({ message }: { message: string }) {
  return (
    <div className={srOnly} role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}
