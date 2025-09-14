import { getLS, setLS } from '@/lib/safeStorage';
import type { Vibe } from '@/lib/vibes';
import type { VibeVector, ComponentScores } from '@/core/vibe/types';
import { PersonalWeightLearner } from './PersonalWeightLearner';

type VenueSnapshot = { type?: string | null; energy?: number | null } | null;
type MovementSnapshot = { speedMps?: number; moving01?: number } | null;
type TemporalSnapshot = { hour: number; isWeekend: boolean };

export interface CorrectionHistory {
  timestamp: number;
  predicted: VibeVector;
  corrected: Vibe;
  components: ComponentScores;
  context: {
    venue?: VenueSnapshot;
    movement: MovementSnapshot;
    temporal: TemporalSnapshot;
  };
}

const KEY = 'vibe:corrections:v1';

// Optional SecureStore on RN; web gets localStorage
async function getSecure(): Promise<{
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
} | null> {
  try {
    // @ts-ignore dynamic import only on RN/Expo
    const mod = await import('expo-secure-store');
    if (mod?.getItemAsync && mod?.setItemAsync) {
      return {
        getItem: (k) => mod.getItemAsync(k),
        setItem: (k, v) => mod.setItemAsync(k, v),
      };
    }
  } catch {}
  return null;
}

async function readAll(): Promise<CorrectionHistory[]> {
  const sec = await getSecure();
  try {
    if (sec) {
      const raw = await sec.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    }
    const raw = getLS(KEY, '[]');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(arr: CorrectionHistory[]) {
  const sec = await getSecure();
  const json = JSON.stringify(arr);
  if (sec) {
    try { await sec.setItem(KEY, json); return; } catch {}
  }
  setLS(KEY, json);
}

export class CorrectionStore {
  private readonly MAX = 200;

  async getAll() {
    return await readAll();
  }

  async save(c: CorrectionHistory) {
    const arr = await readAll();
    arr.push(c);
    while (arr.length > this.MAX) arr.shift();
    await writeAll(arr);

    // Small threshold to kick the learner
    if (arr.length >= 8) {
      const learner = new PersonalWeightLearner();
      await learner.learn(arr);
    }
  }

  async reset() {
    await writeAll([]);
  }

  async getStats() {
    const corrections = await readAll();
    const recent = corrections.filter(c => c.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    return {
      total: corrections.length,
      recent: recent.length,
      patterns: this.analyzePatterns(corrections).length,
      accuracy: recent.length > 0 ? recent.filter(c => {
        const predictedVibe = Object.keys(c.predicted).reduce((a, b) => 
          c.predicted[a as Vibe] > c.predicted[b as Vibe] ? a : b
        ) as Vibe;
        return predictedVibe === c.corrected;
      }).length / recent.length : 0
    };
  }

  private analyzePatterns(corrections: CorrectionHistory[]) {
    if (corrections.length < 5) return [];

    const patterns = [];
    
    // Morning coffee pattern
    const morningCoffee = corrections.filter(c =>
      c.context.temporal.hour >= 6 &&
      c.context.temporal.hour <= 10 &&
      c.context.venue?.type === 'coffee'
    );
    
    if (morningCoffee.length >= 3) {
      patterns.push({
        type: 'morning-coffee',
        count: morningCoffee.length,
        confidence: Math.min(1, morningCoffee.length / 10)
      });
    }

    return patterns;
  }
}