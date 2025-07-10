// Analytics wrapper for PostHog, Umami, or other analytics SDKs
export const track = (event: string, properties?: Record<string, any>) => {
  try {
    // Check for analytics on window object (PostHog, Umami, etc.)
    if (typeof window !== 'undefined' && (window as any).analytics?.track) {
      (window as any).analytics.track(event, properties);
    }
    
    // Add other analytics providers here as needed
    // e.g., PostHog: window.posthog?.capture(event, properties)
    // e.g., Umami: window.umami?.track(event, properties)
    
  } catch (error) {
    // Silently fail in case analytics isn't configured
    console.debug('Analytics tracking failed:', error);
  }
};