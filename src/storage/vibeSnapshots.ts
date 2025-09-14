import type { VibeReading } from '@/core/vibe/types';
import { insertReading, getRecentReadings } from './vibeDb';

export async function saveSnapshot(r: VibeReading) {
  try { await insertReading(r); } catch {}
}

export async function loadSnapshots(limit = 100): Promise<VibeReading[]> {
  try { return await getRecentReadings(limit); } catch { return []; }
}