// Shared error tracking utility for both web and mobile
import { track } from './analytics'

export function trackError(error: unknown, context?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error))

  // Initialize Sentry based on platform
  try {
    if (typeof window !== 'undefined') {
      // Web environment
      import('@sentry/react').then(({ captureException }) => {
        captureException(err, { extra: context })
      }).catch(() => {
        console.warn('Sentry web not available')
      })
    } else {
      // Native environment
      try {
        const { captureException } = require('sentry-expo')
        captureException(err, { extra: context })
      } catch {
        console.warn('Sentry native not available')
      }
    }
  } catch (sentryError) {
    console.warn('Sentry error tracking failed:', sentryError)
  }

  // Also track to our analytics system
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