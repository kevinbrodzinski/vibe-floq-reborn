import { useCallback, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export type HapticPattern =
  | 'light' | 'medium' | 'heavy'
  | 'success' | 'warning' | 'error'
  | 'selection' | 'impact' | 'notification'
  | 'convergence' | 'rally' | 'breadcrumb';

interface EnhancedHapticsOptions {
  enabled?: boolean;
  throttle?: number;
  respectUserPreference?: boolean;
}

// Advanced haptic patterns with contextual intelligence
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  // Basic intensity levels
  light: 8,
  medium: 15,
  heavy: 30,
  
  // Contextual feedback
  success: [10, 40, 10],
  warning: [20, 80, 20],
  error: [40, 40, 40],
  selection: 5,
  impact: 20,
  notification: [10, 25, 10, 25, 10],
  
  // App-specific patterns
  convergence: [15, 30, 15, 30, 25],  // Friend crossing paths
  rally: [20, 50, 20],                // Rally creation
  breadcrumb: [8, 15, 8],             // Trail navigation
};

// Audio frequencies for subtle feedback when haptics unavailable
const AUDIO_FREQUENCIES: Record<HapticPattern, number> = {
  light: 1000, medium: 800, heavy: 600,
  success: 1200, warning: 900, error: 400,
  selection: 1100, impact: 700, notification: 1000,
  convergence: 850, rally: 950, breadcrumb: 1050,
};

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
         ('ontouchstart' in window);
}

export function useEnhancedHaptics({
  enabled = true,
  throttle = 100,
  respectUserPreference = true
}: EnhancedHapticsOptions = {}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const lastTrigger = useRef<number>(0);
  const audioContext = useRef<AudioContext | null>(null);

  // Check if haptics should be enabled
  const shouldTrigger = useCallback(() => {
    if (!enabled) return false;
    if (prefersReducedMotion) return false;
    
    // Throttle rapid successive calls
    const now = Date.now();
    if (now - lastTrigger.current < throttle) return false;
    lastTrigger.current = now;
    
    return true;
  }, [enabled, prefersReducedMotion, throttle]);

  // Initialize audio context lazily
  const getAudioContext = useCallback(() => {
    if (!audioContext.current) {
      try {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        // Audio not available
      }
    }
    return audioContext.current;
  }, []);

  // Play subtle audio cue as haptic fallback
  const playAudioCue = useCallback((pattern: HapticPattern) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = AUDIO_FREQUENCIES[pattern];
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio failed - ignore silently
    }
  }, [getAudioContext]);

  // Trigger Capacitor haptics for native apps
  const triggerCapacitorHaptics = useCallback(async (pattern: HapticPattern) => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return false;

      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      
      switch (pattern) {
        case 'light':
        case 'selection':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
        case 'impact':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
        case 'error':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
        case 'rally':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'notification':
        case 'convergence':
        case 'breadcrumb':
          await Haptics.selectionStart();
          break;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Main haptic trigger function
  const triggerHaptic = useCallback(async (pattern: HapticPattern) => {
    if (!shouldTrigger()) return;

    // Try Capacitor haptics first (for native apps)
    const capacitorWorked = await triggerCapacitorHaptics(pattern);
    if (capacitorWorked) return;

    // Fall back to web vibration API
    if (isMobileDevice() && 'vibrate' in navigator) {
      try {
        const vibrationPattern = HAPTIC_PATTERNS[pattern];
        navigator.vibrate(vibrationPattern);
        return;
      } catch {
        // Vibration failed
      }
    }

    // Final fallback: subtle audio cue
    playAudioCue(pattern);
  }, [shouldTrigger, triggerCapacitorHaptics, playAudioCue]);

  // Convenience methods for common patterns
  const contextualTriggers = {
    // Basic intensity
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    
    // User feedback
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    selection: () => triggerHaptic('selection'),
    
    // App-specific contexts
    convergence: () => triggerHaptic('convergence'),
    rally: () => triggerHaptic('rally'),
    breadcrumb: () => triggerHaptic('breadcrumb'),
    
    // Legacy compatibility
    tap: () => triggerHaptic('light'),
    buttonPress: () => triggerHaptic('light'),
    toggle: () => triggerHaptic('selection'),
  };

  return {
    triggerHaptic,
    ...contextualTriggers,
    
    // Status helpers
    isEnabled: enabled && !prefersReducedMotion,
    isMobile: isMobileDevice(),
  };
}