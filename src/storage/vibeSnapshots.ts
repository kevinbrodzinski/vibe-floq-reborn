import type { VibeReading } from "@/core/vibe/types";

const KEY = "vibe_snapshots_v1";
const LIMIT = 100;

export function saveSnapshot(r: VibeReading) {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const arr: VibeReading[] = raw ? JSON.parse(raw) : [];
    arr.push(r);
    while (arr.length > LIMIT) arr.shift();
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {}
}

export function loadSnapshots(): VibeReading[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}