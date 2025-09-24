// Safe haptics wrapper with fallbacks
export function haptic(type: 'light' | 'success' | 'error' = 'light') {
  try {
    // Haptics API for modern browsers
    if ('vibrate' in navigator) {
      const pattern = type === 'success' ? 30 : type === 'error' ? [10, 40, 10] : 15;
      navigator.vibrate(pattern);
    }
    
    // Capacitor haptics for mobile apps
    if ((window as any).Capacitor?.Plugins?.Haptics) {
      const { Haptics, ImpactStyle } = (window as any).Capacitor.Plugins;
      const style = type === 'success' ? ImpactStyle.Medium : 
                   type === 'error' ? ImpactStyle.Heavy : ImpactStyle.Light;
      Haptics.impact({ style });
    }
  } catch (error) {
    // Silently fail - haptics are optional enhancement
    console.debug('Haptics not available:', error);
  }
}

// Specific haptic patterns for common actions
export const haptics = {
  tap: () => haptic('light'),
  success: () => haptic('success'),
  error: () => haptic('error'),
  toggle: () => haptic('light'),
  buttonPress: () => haptic('light'),
} as const;