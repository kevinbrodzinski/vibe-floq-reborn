// src/features/field/lens.ts
export type Lens = 'explore' | 'constellation' | 'temporal';
export const LENS_STORAGE_KEY = 'floq.active_lens.v1';

export function loadLens(): Lens {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(LENS_STORAGE_KEY)) || 'explore';
  return (['explore','constellation','temporal'] as Lens[]).includes(v as Lens) ? (v as Lens) : 'explore';
}
export function saveLens(l: Lens) {
  try { localStorage.setItem(LENS_STORAGE_KEY, l); } catch {}
}