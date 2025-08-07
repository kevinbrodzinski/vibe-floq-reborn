// src/lib/vibeConstants.ts
import { VIBES, VIBE_COLORS, type Vibe } from '@/lib/vibes';

export type VibeMeta = {
  vibe: Vibe;
  emoji: string;
  label: string;
  color: string;
  energy: number; // 0-100
  social: number; // 0-100 
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
};

export const vibeOptions: VibeMeta[] = VIBES.map((vibe) => {
  const baseMeta: Record<Vibe, Omit<VibeMeta, 'vibe'>> = {
    chill: { emoji: '😌', label: 'Chill', color: VIBE_COLORS.chill, energy: 30, social: 40, timeOfDay: 'any' },
    flowing: { emoji: '🌊', label: 'Flowing', color: VIBE_COLORS.flowing, energy: 50, social: 30, timeOfDay: 'any' },
    romantic: { emoji: '💕', label: 'Romantic', color: VIBE_COLORS.romantic, energy: 60, social: 80, timeOfDay: 'evening' },
    hype: { emoji: '🔥', label: 'Hype', color: VIBE_COLORS.hype, energy: 90, social: 90, timeOfDay: 'night' },
    weird: { emoji: '🤪', label: 'Weird', color: VIBE_COLORS.weird, energy: 70, social: 60, timeOfDay: 'any' },
    solo: { emoji: '🧘', label: 'Solo', color: VIBE_COLORS.solo, energy: 20, social: 10, timeOfDay: 'any' },
    social: { emoji: '👥', label: 'Social', color: VIBE_COLORS.social, energy: 70, social: 95, timeOfDay: 'afternoon' },
    open: { emoji: '🌱', label: 'Open', color: VIBE_COLORS.open, energy: 40, social: 70, timeOfDay: 'morning' },
    down: { emoji: '😔', label: 'Down', color: VIBE_COLORS.down, energy: 10, social: 20, timeOfDay: 'any' },
  };

  return {
    vibe,
    ...baseMeta[vibe]
  };
});

export const getVibeMeta = (vibe: Vibe) =>
  vibeOptions.find(v => v.vibe === vibe) || vibeOptions[0];

export const getVibeEmoji = (vibe: Vibe) =>
  getVibeMeta(vibe).emoji;

export const getVibeLabel = (vibe: Vibe) =>
  getVibeMeta(vibe).label;

export const getVibeColor = (vibe: Vibe) =>
  getVibeMeta(vibe).color;

export const getVibeEnergy = (vibe: Vibe) =>
  getVibeMeta(vibe).energy;

export const getVibeSocial = (vibe: Vibe) =>
  getVibeMeta(vibe).social;

export const getVibeTimeOfDay = (vibe: Vibe) =>
  getVibeMeta(vibe).timeOfDay;