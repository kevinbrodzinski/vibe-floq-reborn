import { describe, it, expect, beforeEach } from 'vitest';
import { upsertPresence } from '@/lib/presence';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'test-id' }, error: null }))
      }))
    }))
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('Presence System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upsert presence with venue_id=null', async () => {
    const result = await upsertPresence({
      profile_id: 'test-profile-id',
      venue_id: null,
      vibe: 'chill',
      point: { lat: 40.7128, lng: -74.0060 }
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('presence');
    expect(result).toEqual({ id: 'test-id' });
  });

  it('should upsert presence with venue_id=uuid', async () => {
    const venueId = '123e4567-e89b-12d3-a456-426614174000';
    
    const result = await upsertPresence({
      profile_id: 'test-profile-id',
      venue_id: venueId,
      vibe: 'social',
      point: { lat: 40.7128, lng: -74.0060 }
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('presence');
    expect(result).toEqual({ id: 'test-id' });
  });

  it('should handle conflict resolution with profile_id,venue_id', async () => {
    const upsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'test-id' }, error: null }))
      }))
    }));

    mockSupabase.from.mockReturnValue({
      upsert: upsertMock
    });

    await upsertPresence({
      profile_id: 'test-profile-id',
      venue_id: 'test-venue-id',
      vibe: 'hype',
      point: null
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'test-profile-id',
        venue_id: 'test-venue-id',
        vibe: 'hype',
        location: null
      }),
      { onConflict: 'profile_id,venue_id' }
    );
  });

  it('should create WKT geometry from point', async () => {
    const upsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'test-id' }, error: null }))
      }))
    }));

    mockSupabase.from.mockReturnValue({
      upsert: upsertMock
    });

    await upsertPresence({
      profile_id: 'test-profile-id',
      venue_id: null,
      vibe: 'curious',
      point: { lat: 40.7128, lng: -74.0060 }
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'SRID=4326;POINT(-74.0060 40.7128)'
      }),
      { onConflict: 'profile_id,venue_id' }
    );
  });
});