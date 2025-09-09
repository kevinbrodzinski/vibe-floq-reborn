// src/components/field/LensSwitcher.tsx
import React from 'react';
import { useFieldLens } from './FieldLensProvider';
import type { Lens } from '@/features/field/lens';

const LABELS: Record<Lens, string> = {
  explore: 'Explore',
  constellation: 'Constellation',
  temporal: 'Temporal',
};

export function LensSwitcher() {
  const { lens, setLens } = useFieldLens();
  return (
    <div
      aria-label="Lens switcher"
      className="fixed top-6 right-6 z-[600] flex items-center gap-2 bg-black/35 backdrop-blur px-2 py-2 rounded-xl"
      style={{ pointerEvents: 'auto' }}
    >
      {(Object.keys(LABELS) as Lens[]).map((k) => (
        <button
          key={k}
          onClick={() => setLens(k)}
          aria-pressed={lens === k}
          className={`px-3 py-2 rounded-lg text-sm ${lens===k ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80'} focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  );
}