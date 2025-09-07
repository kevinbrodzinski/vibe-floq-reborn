import type { VibeToken } from '@/types/field';

const vibeHues: Record<VibeToken, number> = {
  hype: 280, 
  social: 30, 
  chill: 210, 
  flowing: 195, 
  open: 140, 
  curious: 260,
  solo: 180, 
  romantic: 330, 
  weird: 50, 
  down: 215,
};

// h:0..360
export const hslToNearestVibe = (h: number): VibeToken => {
  let best: VibeToken = 'social', d = 999;
  for (const [v, vh] of Object.entries(vibeHues) as [VibeToken, number][]) {
    const dd = Math.min(Math.abs(h - vh), 360 - Math.abs(h - vh));
    if (dd < d) { d = dd; best = v; }
  }
  return best;
};