import React from 'react'
import { trackError } from '@/lib/trackError'

export class ErrorBoundary extends React.Component<
  {children: React.ReactNode; fallback?: React.ReactNode}, {error?: Error}
> {
  state = { error: undefined }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(e: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('💥 Uncaught React error:', e, info)
    
    // Track to Sentry and analytics
    trackError(e, {
      componentStack: info.componentStack,
      errorBoundary: 'SystemErrorBoundary'
    })
  }

  render() {
    const { error } = this.state
    if (error)
      return this.props.fallback ?? (
        <div style={{ padding: 32, fontFamily: 'system-ui' }}>
          <h2>Something went wrong 😔</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
        </div>
      )
    return this.props.children
  }
}