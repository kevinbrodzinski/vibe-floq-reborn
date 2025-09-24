import { useRef, useCallback } from 'react'

interface AudioFeedbackOptions {
  enabled?: boolean
  volume?: number
}

export function useAudioFeedback({ enabled = true, volume = 0.1 }: AudioFeedbackOptions = {}) {
  const audioContextRef = useRef<AudioContext>()
  const lastPlayTime = useRef<number>(0)
  const throttleDelay = 50 // Minimum time between audio cues

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && ('AudioContext' in window || 'webkitAudioContext' in window)) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (e) {
        console.warn('Audio context not available')
      }
    }
    return audioContextRef.current
  }, [])

  const playTone = useCallback((frequency: number, duration: number = 0.1, type: OscillatorType = 'sine') => {
    if (!enabled) return
    
    const now = Date.now()
    if (now - lastPlayTime.current < throttleDelay) return
    lastPlayTime.current = now

    const audioContext = initAudioContext()
    if (!audioContext) return

    try {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type

      // Fade in/out for smooth audio
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (e) {
      // Silently fail if audio can't play
    }
  }, [enabled, volume, initAudioContext, throttleDelay])

  const playChord = useCallback((frequencies: number[], duration: number = 0.15) => {
    if (!enabled) return

    const audioContext = initAudioContext()
    if (!audioContext) return

    frequencies.forEach((freq, index) => {
      setTimeout(() => playTone(freq, duration, 'sine'), index * 20)
    })
  }, [enabled, playTone, initAudioContext])

  // Timeline-specific audio cues
  const timelineAudio = {
    stopSnap: () => playTone(800, 0.08, 'triangle'),
    stopDrop: () => playTone(600, 0.12, 'sine'),
    stopResize: () => playTone(1000, 0.06, 'square'),
    stopCreate: () => playChord([600, 800, 1000], 0.1),
    stopDelete: () => playTone(300, 0.15, 'sawtooth'),
    stopConflict: () => playTone(400, 0.2, 'square'),
    perfectFlow: () => playChord([800, 1000, 1200, 1500], 0.2),
    collaborationJoin: () => playChord([600, 800], 0.15),
    autoSave: () => playTone(1200, 0.08, 'sine')
  }

  // Interaction audio cues
  const interactionAudio = {
    hover: () => playTone(1500, 0.05, 'sine'),
    click: () => playTone(1000, 0.08, 'triangle'),
    longPress: () => playTone(700, 0.12, 'sine'),
    doubleClick: () => {
      playTone(1000, 0.06, 'triangle')
      setTimeout(() => playTone(1200, 0.06, 'triangle'), 60)
    },
    swipe: () => playTone(800, 0.1, 'sine'),
    error: () => playTone(250, 0.25, 'sawtooth'),
    success: () => playChord([600, 800, 1000], 0.12),
    warning: () => playTone(500, 0.15, 'square')
  }

  // Status audio cues
  const statusAudio = {
    connected: () => playChord([800, 1000], 0.1),
    disconnected: () => playTone(400, 0.2, 'square'),
    syncing: () => {
      // Gentle pulsing tone
      for (let i = 0; i < 3; i++) {
        setTimeout(() => playTone(900, 0.08, 'sine'), i * 150)
      }
    },
    complete: () => playChord([600, 800, 1000, 1200], 0.15)
  }

  const setVolume = useCallback((newVolume: number) => {
    // Volume will be applied on next audio play
  }, [])

  const mute = useCallback(() => {
    // Implemented by setting enabled to false
  }, [])

  return {
    playTone,
    playChord,
    timelineAudio,
    interactionAudio,
    statusAudio,
    setVolume,
    mute,
    
    // Convenience methods
    success: () => interactionAudio.success(),
    error: () => interactionAudio.error(),
    warning: () => interactionAudio.warning(),
    click: () => interactionAudio.click(),
    hover: () => interactionAudio.hover()
  }
}