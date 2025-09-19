import { saveSignal, readQueue, drainQueue } from '@/core/preferences/PreferenceSignals';

// Mock storage for testing
const mockStorage = new Map<string, string>();
jest.mock('@/lib/storage', () => ({
  storage: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) || null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

describe('PreferenceSignals', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('saves and reads signals', async () => {
    const signal = {
      id: 'test-signal-1',
      ts: Date.now(),
      vibe: { v: 0.6, dvdt: 0.02, momentum: 0.1, ts: Date.now() },
      offer: { id: 'venue-1', type: 'coffee', predictedEnergy: 0.7 },
      context: { dow: 2, tod: 14 },
      decision: { action: 'accept' as const, rtMs: 1500 }
    };

    await saveSignal(signal);
    const queue = await readQueue();
    
    expect(queue).toHaveLength(1);
    expect(queue[0]).toEqual(signal);
  });

  it('caps queue to 500 signals', async () => {
    // Fill queue with 502 signals
    for (let i = 0; i < 502; i++) {
      await saveSignal({
        id: `signal-${i}`,
        ts: Date.now(),
        vibe: { v: 0.5, dvdt: 0, momentum: 0, ts: Date.now() },
        offer: { id: 'venue-1', type: 'coffee' },
        context: { dow: 1, tod: 12 },
        decision: { action: 'accept', rtMs: 1000 }
      });
    }

    const queue = await readQueue();
    expect(queue).toHaveLength(500);
    expect(queue[0].id).toBe('signal-2'); // First 2 should be dropped
  });

  it('drains signals in batches', async () => {
    // Add 10 signals
    for (let i = 0; i < 10; i++) {
      await saveSignal({
        id: `signal-${i}`,
        ts: Date.now(),
        vibe: { v: 0.5, dvdt: 0, momentum: 0, ts: Date.now() },
        offer: { id: 'venue-1', type: 'coffee' },
        context: { dow: 1, tod: 12 },
        decision: { action: 'accept', rtMs: 1000 }
      });
    }

    const batch = await drainQueue(5);
    expect(batch).toHaveLength(5);
    
    const remaining = await readQueue();
    expect(remaining).toHaveLength(5);
  });

  it('handles empty queue gracefully', async () => {
    const queue = await readQueue();
    expect(queue).toHaveLength(0);

    const batch = await drainQueue(10);
    expect(batch).toHaveLength(0);
  });
});