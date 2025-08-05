// Shared error tracking utility for both web and mobile
import { track } from './analytics'

export function trackError(error: unknown, context?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error))

  // Track to our analytics system
  try {
    track({
      name: 'Error Encountered',
      props: {
        message: err.message,
        stack: err.stack,
        ...context
      }
    })
  } catch (analyticsError) {
    console.warn('Analytics error tracking failed:', analyticsError)
  }

  // Always log to console for debugging
  console.error('🚨 Error tracked:', err, context)
}