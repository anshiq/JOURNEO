type Context = Record<string, string | undefined>

let capture: ((error: unknown, context: Context) => void) | null = null

export function initTelemetry(): void {
  const dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  void import('@sentry/react').then(Sentry => {
    Sentry.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0 })
    capture = (error, context) => Sentry.captureException(error, { extra: context })
  })
}

export function reportError(error: unknown, context: Context = {}): void {
  capture?.(error, context)
}
