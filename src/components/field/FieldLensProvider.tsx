// src/components/field/FieldLensProvider.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Lens } from '@/features/field/lens';
import { loadLens, saveLens } from '@/features/field/lens';

type Ctx = { lens: Lens; setLens: (l: Lens) => void };
const LensCtx = createContext<Ctx | null>(null);

export function useFieldLens() {
  const v = useContext(LensCtx);
  if (!v) throw new Error('useFieldLens must be used within FieldLensProvider');
  return v;
}

export function FieldLensProvider({ children }: { children: React.ReactNode }) {
  const [lens, setLensState] = useState<Lens>(loadLens());
  const setLens = (l: Lens) => { setLensState(l); saveLens(l); };
  const val = useMemo(() => ({ lens, setLens }), [lens]);
  return <LensCtx.Provider value={val}>{children}</LensCtx.Provider>;
}