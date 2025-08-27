import React from 'react';

export type MomentumState = 'gaining' | 'steady' | 'winding';

export default function MomentumIndicator({ state }: { state: MomentumState }) {
  const label = state === 'gaining' ? 'Floq is gaining steam' : state === 'winding' ? 'Floq is winding down' : 'Floq is steady';
  
  return (
    <div className="flex items-center gap-2 p-3">
      {/* TODO: replace with animated orbit/glow (framer-motion or CSS animation) */}
      <div className="w-4 h-4 rounded-full bg-accent opacity-70" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}