// Web-only vibe snapshots storage (localStorage fallback)
// For React Native, create vibeDb.native.ts with expo-sqlite implementation

import type { VibeReading } from '@/core/vibe/types';

const SNAP_EVT = 'vibe:snapshot';
const KEY = 'vibe:snapshots:v2';
const LIMIT = 100;

export async function initVibeDb() {
  // Web uses localStorage, no initialization needed
}

export async function insertReading(r: VibeReading) {
  try {
    const arr: VibeReading[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    arr.push(r);
    while (arr.length > LIMIT) arr.shift();
    localStorage.setItem(KEY, JSON.stringify(arr));
    // notify listeners (SSR-safe)
    try {
      // @ts-ignore
      document?.dispatchEvent?.(new CustomEvent(SNAP_EVT, { detail: r.timestamp }));
    } catch {}
  } catch {}
}

export async function getRecentReadings(limit = 100): Promise<VibeReading[]> {
  try {
    const arr: VibeReading[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return arr.slice(-limit).reverse();
  } catch { 
    return []; 
  }
}