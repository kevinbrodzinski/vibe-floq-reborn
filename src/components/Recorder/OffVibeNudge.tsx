// src/components/Recorder/OffVibeNudge.tsx
import React from 'react';
import { getVibeToken } from '@/lib/tokens/vibeTokens';

type Nudge = {
  message: string;
  pivotLabel: string;
  destination?: { name: string; etaMin: number };
};

function computeNudge(groupEnergy: number, venueEnergy: number, sessionMin: number): Nudge | null {
  const delta = groupEnergy - venueEnergy; // + means group wants more energy
  if (Math.abs(delta) < 0.18 && sessionMin < 120) return null;

  if (delta < 0) {
    return { message: 'Energy mismatch—too hype for the crew',
      pivotLabel: 'Find calmer spot', destination: { name: 'Cozy nearby', etaMin: 2 } };
  }
  return { message: 'Looks a bit tame right now',
    pivotLabel: 'Find lively spot', destination: { name: 'More energy nearby', etaMin: 3 } };
}

export function OffVibeNudge({ groupEnergy, venueEnergy, sessionMin, onPivot }:{
  groupEnergy: number; venueEnergy: number; sessionMin: number; onPivot: () => void;
}) {
  const nudge = computeNudge(groupEnergy, venueEnergy, sessionMin);
  if (!nudge) return null;
  const t = getVibeToken('calm' as any);
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-28 flex items-center gap-12 px-16 py-12 rounded-2xl"
         style={{ background: t.bg, border: `1px solid ${t.ring}`, boxShadow: `0 0 24px ${t.glow}` }}>
      <div className="text-white/90">{nudge.message}</div>
      <button onClick={onPivot} className="px-12 py-8 rounded-xl" style={{ background: t.base, color: t.fg }}>
        {nudge.pivotLabel}{nudge.destination ? ` • ${nudge.destination.etaMin} min` : ''}
      </button>
    </div>
  );
}