
// Analytics utilities with fallbacks for mobile and web

// Extend Window interface for Capacitor
declare global {
  interface Window {
    Capacitor?: any;
  }
}

export type TrackProps = Record<string, unknown>

// Overloaded track function - supports both object and rest param styles
export function track(event: string, props?: TrackProps): void
export function track(event: string, ...args: unknown[]): void
export function track(event: string, ...rest: any[]) {
  // Object form or convert positional args to object
  const props: TrackProps = 
    rest.length === 1 && typeof rest[0] === 'object'
      ? rest[0] as TrackProps
      : rest.reduce<TrackProps>((acc, cur, i) => {
          acc[`arg${i}`] = cur
          return acc
        }, {})
  
  try {
    console.log('📊 Track event:', event, props)
    // Add actual analytics implementation here (e.g., Mixpanel, Amplitude)
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
