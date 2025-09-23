import React from 'react';

type Props = {
  enabled?: boolean;
  color?: string;
  count?: number;
};

export function FabOrbitParticles({ 
  enabled = true, 
  color,
  count = 3 
}: Props) {
  // Respect reduced motion preferences
  const prefersReduced = typeof matchMedia !== 'undefined' && 
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!enabled || prefersReduced) return null;

  return (
    <div className="pointer-events-none fixed bottom-[88px] right-[22px] z-[59] w-[48px] h-[48px]">
      {[0, 2, 4].slice(0, count).map((delay) => (
        <span
          key={delay}
          className="absolute top-1/2 left-1/2 block w-[3px] h-[3px] rounded-full"
          style={{
            background: color || 'rgba(102,126,234,0.6)',
            boxShadow: '0 0 6px rgba(102,126,234,0.8)',
            animation: `orbit 6s linear -${delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}