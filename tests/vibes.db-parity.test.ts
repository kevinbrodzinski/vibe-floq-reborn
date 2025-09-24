import { VIBES } from '@/lib/vibes';

describe('VIBE enum parity', () => {
  it('UI list matches DB enum', () => {
    // Update this if the Supabase enum changes
    const DB_ENUM = [
      'chill','hype','curious','social','solo','romantic','weird','down','flowing','open','energetic','excited','focused',
    ] as const;
    expect(new Set(VIBES)).toEqual(new Set(DB_ENUM));
  });

  it('has correct number of vibes', () => {
    expect(VIBES.length).toBe(13);
  });

  it('all vibes are lowercase', () => {
    VIBES.forEach(vibe => {
      expect(vibe).toBe(vibe.toLowerCase());
    });
  });
});