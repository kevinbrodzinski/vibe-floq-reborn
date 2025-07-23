import { useRef, useCallback } from 'react'

export interface HapticFeedbackOptions {
  enabled?: boolean
}

export type HapticPattern = 
  | 'light' 
  | 'medium' 
  | 'heavy'
  | 'success'
  | 'warning' 
  | 'error'
  | 'selection'
  | 'impact'
  | 'notification'

export function useAdvancedHaptics({ enabled = true }: HapticFeedbackOptions = {}) {
  const lastHapticRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const throttleDelay = 100 // Minimum time between haptics

  const triggerHaptic = useCallback((pattern: HapticPattern, options?: { force?: boolean }) => {
    if (!enabled && !options?.force) return
    
    // Check if we're on a mobile platform with touch support
    const isMobile = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('Mobile') || 
       window.navigator.userAgent.includes('Android') ||
       window.navigator.userAgent.includes('iPhone')) &&
      'ontouchstart' in window;
    
    if (!isMobile) {
      // No-op on non-mobile platforms
      return;
    }
    
    const now = Date.now()
    if (now - lastHapticRef.current < throttleDelay && !options?.force) return
    
    lastHapticRef.current = now

    // Native haptic feedback for supported devices
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 20, 10],
        warning: [15, 10, 15],
        error: [50, 20, 50],
        selection: [5],
        impact: [25],
        notification: [10, 10, 10, 10, 10]
      }
      
      navigator.vibrate(patterns[pattern])
    }

    // Web Audio API for subtle audio cues (cached singleton)
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      try {
        // Cache AudioContext to avoid hitting Safari's 6-context limit
        const audioCtx = audioContextRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        
        const frequencies = {
          light: 800,
          medium: 600,
          heavy: 400,
          success: 900,
          warning: 700,
          error: 300,
          selection: 1000,
          impact: 500,
          notification: 850
        }
        
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        oscillator.frequency.setValueAtTime(frequencies[pattern], audioCtx.currentTime)
        oscillator.type = 'sine'
        
        // Very subtle volume
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05)
        
        oscillator.start(audioCtx.currentTime)
        oscillator.stop(audioCtx.currentTime + 0.05)
      } catch (e) {
        // Audio context failed, silently continue
      }
    }
  }, [enabled, throttleDelay])

  // Timeline-specific haptic patterns
  const timelineHaptics = {
    stopDragStart: () => triggerHaptic('light'),
    stopDragEnd: () => triggerHaptic('medium'),
    stopSnap: () => triggerHaptic('success'),
    stopResize: () => triggerHaptic('selection'),
    stopConflict: () => triggerHaptic('warning'),
    stopDelete: () => triggerHaptic('error'),
    stopCreate: () => triggerHaptic('impact'),
    collaborationJoin: () => triggerHaptic('notification'),
    collaborationEdit: () => triggerHaptic('light'),
    autoSave: () => triggerHaptic('success', { force: false }),
    networkReconnect: () => triggerHaptic('success'),
    bulkAction: () => triggerHaptic('heavy')
  }

  // Gesture-based haptics
  const gestureHaptics = {
    longPress: () => triggerHaptic('medium'),
    doubleClick: () => triggerHaptic('light'),
    multiSelect: () => triggerHaptic('selection'),
    swipe: () => triggerHaptic('light'),
    pinch: () => triggerHaptic('light'),
    hover: () => triggerHaptic('light', { force: false })
  }

  // Contextual feedback
  const contextualHaptics = {
    confirmation: () => triggerHaptic('success'),
    cancellation: () => triggerHaptic('warning'),
    validation: () => triggerHaptic('error'),
    loading: () => triggerHaptic('light'),
    complete: () => triggerHaptic('impact'),
    planCompletion: () => triggerHaptic('heavy'),
    planExecutionStart: () => triggerHaptic('impact')
  }

  return {
    triggerHaptic,
    timelineHaptics,
    gestureHaptics,
    contextualHaptics,
    
    // Convenience methods
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy')
  }
}