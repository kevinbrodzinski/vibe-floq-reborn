// src/lib/vibeConstants.ts
import { VIBES, type Vibe } from '@/lib/vibes';

export type VibeMeta = {
  id: Vibe;
  label: string;
  emoji: string;
  color: string;
  energy: 'low' | 'medium' | 'high';
  social: 'solo' | 'group' | 'any';
  timeOfDay: 'day' | 'night' | 'any';
};

export const vibeOptions: VibeMeta[] = VIBES.map((vibe) => {
  const map: Record<Vibe, Omit<VibeMeta, 'id'>> = {
    chill:     { label: 'Chill',     emoji: '🛋️', color: 'blue',   energy: 'low',    social: 'any',  timeOfDay: 'night' },
    hype:      { label: 'Hype',      emoji: '⚡️', color: 'orange', energy: 'high',   social: 'group', timeOfDay: 'night' },
    curious:   { label: 'Curious',   emoji: '🧠', color: 'violet', energy: 'medium', social: 'any',  timeOfDay: 'day' },
    social:    { label: 'Social',    emoji: '👯‍♀️', color: 'yellow', energy: 'medium', social: 'group', timeOfDay: 'any' },
    solo:      { label: 'Solo',      emoji: '🌙', color: 'gray',   energy: 'low',    social: 'solo', timeOfDay: 'night' },
    romantic:  { label: 'Romantic',  emoji: '💘', color: 'pink',   energy: 'medium', social: 'group', timeOfDay: 'night' },
    weird:     { label: 'Weird',     emoji: '👽', color: 'lime',   energy: 'medium', social: 'any',  timeOfDay: 'night' },
    down:      { label: 'Down',      emoji: '🫠', color: 'rose',   energy: 'low',    social: 'solo', timeOfDay: 'any' },
    flowing:   { label: 'Flowing',   emoji: '🌊', color: 'cyan',   energy: 'medium', social: 'any',  timeOfDay: 'day' },
    open:      { label: 'Open',      emoji: '🌈', color: 'green',  energy: 'medium', social: 'any',  timeOfDay: 'any' },
    energetic: { label: 'Energetic', emoji: '⚡', color: 'amber',  energy: 'high',   social: 'group', timeOfDay: 'day' },
    excited:   { label: 'Excited',   emoji: '🤩', color: 'purple', energy: 'high',   social: 'group', timeOfDay: 'any' },
    focused:   { label: 'Focused',   emoji: '🎯', color: 'emerald', energy: 'medium', social: 'solo', timeOfDay: 'day' },
  };

  return {
    id: vibe,
    ...map[vibe],
  };
});

export const getVibeMeta = (vibe: Vibe) =>
  vibeOptions.find((v) => v.id === vibe)!;

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