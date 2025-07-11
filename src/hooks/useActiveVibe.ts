import { useMemo } from 'react';
import { useEnhancedPresence } from './useEnhancedPresence';
import type { Vibe } from '@/types';

const getVibeLabel = (vibe: Vibe): string => {
  const labels: Record<Vibe, string> = {
    chill: 'Chill Mode',
    hype: 'Hype Energy',
    curious: 'Curious Exploring',
    social: 'Social Flow',
    solo: 'Solo Vibes',
    romantic: 'Romantic Mood',
    weird: 'Weird Energy',
    down: 'Feeling Down',
    flowing: 'Going with the Flow',
    open: 'Open to Anything',
  };
  return labels[vibe] || 'Social Flow';
};

export const useActiveVibe = () => {
  const { currentVibe } = useEnhancedPresence();
  
  return useMemo(() => ({
    vibeTag: currentVibe || 'social',
    vibeLabel: getVibeLabel(currentVibe || 'social'),
  }), [currentVibe]);
};