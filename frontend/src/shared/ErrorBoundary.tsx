import { Component, type ErrorInfo, type ReactNode } from 'react'
import { strings } from './strings'
import { reportError } from './telemetry'

interface BoundaryProps {
  children: ReactNode
  context: string
  fallback?: (reset: () => void) => ReactNode
}

interface BoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportError(error, { context: this.props.context, componentStack: info.componentStack ?? undefined })
  }

  reset = (): void => {
    this.setState({ failed: false })
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.reset)
    return <ErrorNotice action={{ label: strings.retry, onClick: this.reset }} />
  }
}

export function ErrorNotice({ action, fill }: { action: { label: string; onClick: () => void }; fill?: boolean }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#0f172a',
        minHeight: fill ? '100vh' : undefined,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{strings.somethingWrong}</p>
      <button
        type="button"
        onClick={action.onClick}
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          background: '#ffffff',
          padding: '6px 12px',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {action.label}
      </button>
    </div>
  )
}
