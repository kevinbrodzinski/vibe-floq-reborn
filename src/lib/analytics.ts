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