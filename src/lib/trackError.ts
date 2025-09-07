// Shared error tracking utility for both web and mobile
import { track } from './analytics'

export function trackError(error: unknown, context?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error))

  // Skip tracking in sandbox/preview to avoid rate limiting
  const isSandbox = typeof window !== 'undefined' && (
    /sandbox\.lovable\.dev$/.test(window.location.host) || 
    window.location.host.includes('preview') ||
    import.meta.env.VITE_SANDBOX === '1'
  );

  if (isSandbox) {
    console.warn('🚨 Error (sandbox - not tracked):', err, context);
    return;
  }

  // Track to our analytics system only outside sandbox
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