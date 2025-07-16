import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface ErrorInfo {
  message: string
  stack?: string
  componentStack?: string
}

export function useErrorBoundary() {
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [hasError, setHasError] = useState(false)

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    const errorData: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack
    }

    setError(errorData)
    setHasError(true)

    // Log to console for debugging
    console.error('Error captured by boundary:', error, errorInfo)

    // Show user-friendly toast
    toast.error('Something went wrong', {
      description: 'The app encountered an error. Please try refreshing the page.',
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload()
      }
    })
  }, [])

  const resetError = useCallback(() => {
    setError(null)
    setHasError(false)
  }, [])

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        const result = await fn(...args)
        return result
      } catch (error) {
        captureError(error as Error)
        return undefined
      }
    }
  }, [captureError])

  return {
    error,
    hasError,
    captureError,
    resetError,
    withErrorHandling
  }
}