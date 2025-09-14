// Expo SQLite (mobile) + Web fallback (localStorage). SSR-safe.
// API: initVibeDb(), insertReading(r), getRecentReadings(limit)

import type { VibeReading } from '@/core/vibe/types';

let dbReady = false;
let sqlite: any = null;

// try dynamic import for RN/Expo
async function tryLoadExpoSqlite() {
  try {
    // @ts-ignore
    const mod = await import('expo-sqlite');
    sqlite = mod.openDatabase?.('vibe.db') || null;
  } catch { sqlite = null; }
}

export async function initVibeDb() {
  if (dbReady) return;
  await tryLoadExpoSqlite();
  if (sqlite) {
    sqlite.transaction((tx: any) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS vibe_snapshots (
          ts INTEGER PRIMARY KEY,
          vibe TEXT NOT NULL,
          confidence REAL NOT NULL,
          calc_ms REAL NOT NULL,
          components TEXT NOT NULL,
          vector TEXT NOT NULL
        )`
      );
    });
  }
  dbReady = true;
}

// Insert + prune to 100
export async function insertReading(r: VibeReading) {
  await initVibeDb();
  if (sqlite) {
    sqlite.transaction((tx: any) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO vibe_snapshots (ts, vibe, confidence, calc_ms, components, vector)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.timestamp, r.vibe, r.confidence01, r.calcMs, JSON.stringify(r.components), JSON.stringify(r.vector)]
      );
      // prune
      tx.executeSql(
        `DELETE FROM vibe_snapshots WHERE ts NOT IN (SELECT ts FROM vibe_snapshots ORDER BY ts DESC LIMIT 100)`
      );
    });
    return;
  }
  // Web fallback: localStorage ring
  try {
    const KEY = 'vibe:snapshots:v2';
    const arr: VibeReading[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    arr.push(r); while (arr.length > 100) arr.shift();
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {}
}

export async function getRecentReadings(limit = 100): Promise<VibeReading[]> {
  await initVibeDb();
  if (sqlite) {
    return await new Promise((resolve) => {
      sqlite.transaction((tx: any) => {
        tx.executeSql(
          `SELECT * FROM vibe_snapshots ORDER BY ts DESC LIMIT ?`,
          [limit],
          (_: any, { rows }: any) => {
            const out: VibeReading[] = [];
            for (let i = 0; i < rows.length; i++) {
              const r = rows.item(i);
              out.push({
                timestamp: r.ts,
                vibe: r.vibe,
                confidence01: r.confidence,
                calcMs: r.calc_ms,
                components: JSON.parse(r.components),
                vector: JSON.parse(r.vector),
              });
            }
            resolve(out);
          }
        );
      });
    });
  }
  try {
    const KEY = 'vibe:snapshots:v2';
    const arr: VibeReading[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return arr.slice(-limit).reverse();
  } catch { return []; }
}