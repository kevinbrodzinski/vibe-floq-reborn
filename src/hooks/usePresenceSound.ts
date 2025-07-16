import { useEffect, useRef, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useHapticFeedback } from './useHapticFeedback';

// Simple sound utility for presence events
const playSound = (type: 'join' | 'leave') => {
  try {
    // Create audio context for better browser support
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different tones for join/leave
    if (type === 'join') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher tone
      oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
    } else {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Lower tone
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    }
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (error) {
    console.debug('Audio not available:', error);
  }
};

export function usePresenceSound(participants: any[]) {
  const previousParticipants = useRef<Set<string>>(new Set());
  const { socialHaptics } = useHapticFeedback();
  
  // Debounce participants to prevent rapid fire feedback
  const [debouncedParticipants] = useDebounce(participants, 300);
  
  // Use Set for faster lookups and cleaner diffing logic
  const currentIds = useMemo(() => 
    new Set(debouncedParticipants.map(p => p.user_id || p.id)), 
    [debouncedParticipants]
  );
  
  useEffect(() => {
    const previousIds = previousParticipants.current;
    
    // Detect joins - in current but not in previous
    const joined = [...currentIds].filter(id => !previousIds.has(id));
    // Detect leaves - in previous but not in current
    const left = [...previousIds].filter(id => !currentIds.has(id));
    
    // Trigger feedback for joins
    if (joined.length > 0) {
      playSound('join');
      socialHaptics.floqJoined();
    }
    
    // Trigger feedback for leaves
    if (left.length > 0) {
      playSound('leave');
      socialHaptics.crossedPathsDetected(); // Lighter feedback for leaving
    }
    
    // Update ref for next comparison
    previousParticipants.current = new Set(currentIds);
  }, [currentIds, socialHaptics]);
}