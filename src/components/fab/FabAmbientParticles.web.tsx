import React from 'react';

type Props = {
  enabled?: boolean;
  color?: string;
  count?: number;
};

export function FabAmbientParticles({ 
  enabled = true, 
  color,
  count = 6 
}: Props) {
  // Respect reduced motion preferences
  const prefersReduced = typeof matchMedia !== 'undefined' && 
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!enabled || prefersReduced) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 right-2 z-[59] w-[100px] h-[100px]">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute block w-[2px] h-[2px] rounded-full opacity-0"
          style={{
            left: 35 + (i * 5),
            background: color || 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            boxShadow: '0 0 4px rgba(102,126,234,0.7)',
            animation: `floatUp 4s linear ${i * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}