import type { AuroraEventLite, PixelPoint } from '@/lib/field/types';

type StormGroup = { id:string; x:number; y:number; radius:number; intensity:number; conf:number; etaMs:number };

export function detectAurorasFromStorms(storms: StormGroup[], {
  minIntensity = 0.7, 
  maxConcurrent = 3, 
  zoom = 17
} = {}): AuroraEventLite[] {
  if (zoom < 15) return [];
  
  const picks = storms
    .filter(s => s.intensity >= minIntensity && s.etaMs <= 300000)   // 5 min
    .sort((a,b) => (b.intensity*0.6 + b.conf*0.4) - (a.intensity*0.6 + a.conf*0.4))
    .slice(0, maxConcurrent);

  return picks.map((s, i) => ({
    id: `aur_${s.id}_${i}`,
    center: { x:s.x, y:s.y } as PixelPoint,
    radiusPx: Math.min(180, Math.max(40, s.radius)),
    intensity: Math.max(0.65, Math.min(1, s.intensity)),
    hue: 200 // optional if you want to color by vibe later
  }));
}