// Analytics wrapper for PostHog
const POSTHOG_PUBLIC_KEY = 'phc_nHiyd2XAzSYoFQXWVAhG9yrjQvsX6oQTod6eANt1Jnq';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export const track = (event: string, properties?: Record<string, any>) => {
  try {
    // Send directly to PostHog API
    if (typeof window !== 'undefined') {
      fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: POSTHOG_PUBLIC_KEY,
          event,
          properties: {
            ...properties,
            $current_url: window.location.href,
            $browser: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
          distinct_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }),
      }).catch((error) => {
        console.debug('PostHog tracking failed:', error);
      });
    }
  } catch (error) {
    console.debug('Analytics tracking failed:', error);
  }
};

// QA Checklist Analytics Events
export const trackFloqJoin = (floqId: string, floqTitle: string, vibe: string) => {
  track('floq_join', {
    floq_id: floqId,
    floq_title: floqTitle,
    vibe,
    timestamp: new Date().toISOString(),
  });
};

export const trackFloqCreated = (floqId: string, floqTitle: string, vibe: string, isPrivate: boolean, flockType: 'momentary' | 'persistent' = 'momentary', endsAt?: string | null) => {
  track('floq_created', {
    floq_id: floqId,
    floq_title: floqTitle,
    vibe,
    is_private: isPrivate,
    flock_type: flockType,
    ends_at_null: !endsAt,
    timestamp: new Date().toISOString(),
  });
};

export const trackFloqSuggestionDismissed = (floqId: string, reason?: string) => {
  track('floq_suggestion_dismissed', {
    floq_id: floqId,
    dismissal_reason: reason || 'user_action',
    timestamp: new Date().toISOString(),
  });
};

export const trackFloqLeave = (floqId: string, floqTitle: string, sessionDuration?: number) => {
  track('floq_leave', {
    floq_id: floqId,
    floq_title: floqTitle,
    session_duration_ms: sessionDuration,
    timestamp: new Date().toISOString(),
  });
};

export const trackLocationPermission = (granted: boolean, method: 'automatic' | 'manual') => {
  track('location_permission', {
    granted,
    request_method: method,
    timestamp: new Date().toISOString(),
  });
};