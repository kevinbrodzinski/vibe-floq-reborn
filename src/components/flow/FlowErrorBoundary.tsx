import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface FlowErrorBoundaryState {
  hasError: boolean
  error?: Error
  retryCount: number
}

interface FlowErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class FlowErrorBoundary extends React.Component<FlowErrorBoundaryProps, FlowErrorBoundaryState> {
  private retryTimeoutId?: number

  constructor(props: FlowErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<FlowErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FlowErrorBoundary] Flow error caught:', error, errorInfo)

    // Auto-retry for network-related errors
    if (this.isRetryableError(error) && this.state.retryCount < 3) {
      const delay = Math.pow(2, this.state.retryCount) * 1000 // Exponential backoff
      this.retryTimeoutId = window.setTimeout(() => {
        this.setState(prev => ({ 
          hasError: false, 
          error: undefined,
          retryCount: prev.retryCount + 1 
        }))
      }, delay)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId)
    }
  }

  private isRetryableError = (error: Error): boolean => {
    const message = error.message.toLowerCase()
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('timeout') ||
           message.includes('connection')
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, retryCount: 0 })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.handleRetry} />
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Flow System Error
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || 'Something went wrong with the flow system'}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground 
                         rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}