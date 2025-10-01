// src/components/field/LensSwitcher.tsx
import React from 'react';
import { useFieldLens } from './FieldLensProvider';
import type { Lens } from '@/features/field/lens';

const LABELS: Record<Lens, string> = {
  explore: 'Explore',
  constellation: 'Constellation',
  temporal: 'Temporal',
};

const LENSES: readonly Lens[] = ['explore', 'constellation', 'temporal'];

export function LensSwitcher() {
  const { lens, setLens } = useFieldLens();
  
  const nextLens = (currentIndex: number) => 
    LENSES[(currentIndex + 1) % LENSES.length];
    
  const prevLens = (currentIndex: number) => 
    LENSES[(currentIndex - 1 + LENSES.length) % LENSES.length];

  return (
    <div
      role="tablist"
      aria-label="Lens mode"
      className="flex items-center gap-2 bg-black/35 backdrop-blur px-2 py-2 rounded-xl"
      style={{ pointerEvents: 'auto' }}
    >
      {LENSES.map((k, i) => {
        const active = lens === k;
        return (
          <button
            key={k}
            id={`tab-${k}`}
            role="tab"
            aria-selected={active}
            aria-controls={`lens-panel-${k}`}
            tabIndex={active ? 0 : -1}
            onClick={() => setLens(k)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); setLens(nextLens(i)); }
              if (e.key === 'ArrowLeft')  { e.preventDefault(); setLens(prevLens(i)); }
              if (e.key === 'Home')       { e.preventDefault(); setLens('explore'); }
              if (e.key === 'End')        { e.preventDefault(); setLens('temporal'); }
            }}
            className={`px-3 py-2 rounded-lg text-sm ${
              active ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
          >
            {LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}