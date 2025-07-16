import { useEffect, useRef } from 'react';
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
  const previousParticipants = useRef<any[]>([]);
  const { socialHaptics } = useHapticFeedback();
  
  useEffect(() => {
    const currentIds = participants.map(p => p.user_id || p.id);
    const previousIds = previousParticipants.current.map(p => p.user_id || p.id);
    
    // Detect joins
    const joined = currentIds.filter(id => !previousIds.includes(id));
    // Detect leaves  
    const left = previousIds.filter(id => !currentIds.includes(id));
    
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
    previousParticipants.current = [...participants];
  }, [participants, socialHaptics]);
}