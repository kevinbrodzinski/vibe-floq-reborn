
// Analytics utilities with PostHog integration - lean cross-platform approach

const isWeb = typeof window !== 'undefined';

// PostHog capture function - handles both web and mobile
export const capture = (event: string, props?: Record<string, any>) => {
  try {
    if (isWeb) {
      import('posthog-js').then((ph) => {
        ph.default?.capture(event, props);
      });
    } else {
      // React Native PostHog not available - skip for now
      console.log('[PostHog] Mobile capture skipped:', event, props);
    }
  } catch (err) {
    console.warn('[PostHog] capture failed:', err);
  }
};

// PostHog identify function
export const identify = (profileId: string, traits?: Record<string, any>) => {
  try {
    if (isWeb) {
      import('posthog-js').then((ph) => {
        ph.default?.identify(profileId, traits);
      });
    } else {
      // React Native PostHog not available - skip for now
      console.log('[PostHog] Mobile identify skipped:', profileId, traits);
    }
  } catch (err) {
    console.warn('[PostHog] identify failed:', err);
  }
};

// Extend Window interface for Capacitor
declare global {
  interface Window {
    Capacitor?: any;
  }
}

import type { PosthogEvent } from '@/types/posthogEventTypes'

export type TrackProps = Record<string, unknown>

// Type-safe track function for PostHog events
export function track<E extends PosthogEvent>(event: E): void
// Legacy overloaded track function - supports both object and rest param styles
export function track(event: string, props?: TrackProps): void
export function track(event: string, ...args: unknown[]): void
export function track(event: any, ...rest: any[]) {
  // Handle typed PosthogEvent objects
  if (typeof event === 'object' && event.name && event.props) {
    try {
      console.log('📊 Track event:', event.name, event.props)
      capture(event.name, event.props)
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
    return
  }

  // Legacy string-based tracking
  const props: TrackProps = 
    rest.length === 1 && typeof rest[0] === 'object'
      ? rest[0] as TrackProps
      : rest.reduce<TrackProps>((acc, cur, i) => {
          acc[`arg${i}`] = cur
          return acc
        }, {})
  
  try {
    console.log('📊 Track event:', event, props)
    // Send to PostHog via shared capture function
    capture(event, props)
  } catch (error) {
    console.warn('Analytics tracking failed:', error)
  }
}

// Legacy trackEvent function for compatibility
export const trackEvent = track

// Specific tracking functions with flexible signatures
export function trackFloqCreated(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object') {
    return track('floq_created', args[0])
  }
  // Handle positional args: id, title, vibe, isPrivate, type, endsAt
  return track('floq_created', {
    floq_id: args[0],
    title: args[1],
    vibe: args[2],
    is_private: args[3],
    type: args[4],
    ends_at: args[5]
  })
}

export function trackFloqJoin(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object') {
    return track('floq_join', args[0])
  }
  // Handle positional args: floq_id, title, vibe
  return track('floq_join', {
    floq_id: args[0],
    title: args[1],
    vibe: args[2]
  })
}

export function trackFloqSuggestionDismissed(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object') {
    return track('floq_suggestion_dismissed', args[0])
  }
  // Handle positional args: floq_id, reason
  return track('floq_suggestion_dismissed', {
    floq_id: args[0],
    reason: args[1]
  })
}

export function trackLocationPermission(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object') {
    return track('location_permission', args[0])
  }
  // Handle positional args: hasPermission, type
  return track('location_permission', {
    has_permission: args[0],
    permission_type: args[1]
  })
}

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    // For Capacitor/mobile apps
    if (typeof window !== 'undefined' && window.Capacitor) {
      import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
        const style = type === 'light' ? ImpactStyle.Light : 
                     type === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy
        Haptics.impact({ style })
      }).catch(() => {
        console.log('Haptics not available')
      })
    }
    // For web, use vibration API fallback
    else if (navigator.vibrate) {
      const duration = type === 'light' ? 50 : type === 'medium' ? 100 : 200
      navigator.vibrate(duration)
    }
  } catch (error) {
    console.log('Haptic feedback not available:', error)
  }
}
