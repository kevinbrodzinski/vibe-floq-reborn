// src/lib/field/overlayStyleBus.ts
import { useSyncExternalStore } from 'react';
import type { UiGrayToken } from '@/lib/tokens/grayscale';

export type OverlayControls = {
  monochrome: boolean;
  monochromeToken: UiGrayToken; // grayscale design token
  colorize: boolean;            // use vibe color tokens
  dim: boolean;
  dimFactor: number;            // 0..1
  friendHalo: boolean;
  youId?: string;               // current user profile id
};

let state: OverlayControls = {
  monochrome: false,
  monochromeToken: 'gray-12',
  colorize: true,
  dim: false,
  dimFactor: 0.68,
  friendHalo: true,
  youId: undefined,
};

const listeners = new Set<() => void>();

function emit() {
  for (const cb of Array.from(listeners)) {
    try { cb(); } catch {}
  }
}

export function getOverlayControls(): OverlayControls {
  return state;
}

export function setOverlayControls(patch: Partial<OverlayControls>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribeOverlayControls(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook for UI */
export function useOverlayControls(): [OverlayControls, (patch: Partial<OverlayControls>) => void] {
  const snapshot = () => state;
  const subscribe = (cb: () => void) => subscribeOverlayControls(cb);
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [current, setOverlayControls];
}