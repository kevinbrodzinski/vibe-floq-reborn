import { storage } from '@/lib/storage';

export type VibeSnapshot = { 
  v: number; 
  dvdt: number; 
  momentum: number; 
  ts: number;
};

export type VenueOffer = { 
  id: string; 
  type: string; 
  predictedEnergy?: number; 
  distance?: number;
};

export type PreferenceSignal = {
  id: string;
  ts: number;
  vibe: VibeSnapshot;
  offer: VenueOffer;
  context: { dow: number; tod: number; weather?: string };
  decision: { action: 'accept' | 'decline' | 'modify' | 'delay'; rtMs: number };
  outcome?: { satisfaction?: number; wouldRepeat?: boolean };
};

const KEY = 'pref:signals:v1';

export async function saveSignal(s: PreferenceSignal) {
  const raw = (await storage.getItem(KEY)) ?? '[]';
  const arr = JSON.parse(raw) as PreferenceSignal[];
  arr.push(s);
  await storage.setItem(KEY, JSON.stringify(arr.slice(-500))); // cap to 500 per device
  return s.id;
}

export async function readQueue(): Promise<PreferenceSignal[]> {
  const raw = (await storage.getItem(KEY)) ?? '[]';
  return JSON.parse(raw) as PreferenceSignal[];
}

export async function drainQueue(batch = 50): Promise<PreferenceSignal[]> {
  const raw = (await storage.getItem(KEY)) ?? '[]';
  const arr = JSON.parse(raw) as PreferenceSignal[];
  const take = arr.splice(0, batch);
  await storage.setItem(KEY, JSON.stringify(arr));
  return take;
}