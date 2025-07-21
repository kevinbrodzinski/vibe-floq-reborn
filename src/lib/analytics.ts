
// Analytics utilities with fallbacks for mobile and web

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  try {
    console.log('📊 Track event:', eventName, properties)
    // Add actual analytics implementation here (e.g., Mixpanel, Amplitude)
  } catch (error) {
    console.warn('Analytics tracking failed:', error)
  }
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
