import posthog from 'posthog-js'

export const initPostHog = () => {
  // Initialize PostHog only if API key is available
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY
  
  if (typeof window !== 'undefined' && apiKey) {
    posthog.init(apiKey, {
      api_host: 'https://eu.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug()
      },
    })
  }
}

export { posthog }