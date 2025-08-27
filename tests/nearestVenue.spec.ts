import { describe, it, expect, vi } from 'vitest';
import { fetchNearestVenue } from '@/lib/nearestVenue';

describe('fetchNearestVenue', () => {
  it('calls Supabase RPC with correct args and maps response', async () => {
    const mockSupabase = { 
      rpc: vi.fn().mockResolvedValue({ 
        data: [{
          venue_id: '11111111-1111-1111-1111-111111111111',
          name: 'Bestia', 
          distance_m: 42, 
          lat: 34.033, 
          lng: -118.23,
        }] 
      }) 
    } as any;

    // Mock the supabase import
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase
    }));

    const res = await fetchNearestVenue({ 
      lat: 34.0, 
      lng: -118.2, 
      maxDistanceM: 250 
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('rpc_nearest_venue', {
      in_lat: 34.0,
      in_lng: -118.2,
      in_max_distance_m: 250,
    });
    expect(res?.name).toBe('Bestia');
    expect(res?.distance_m).toBe(42);
    expect(res?.venue_id).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('returns null when no data', async () => {
    const mockSupabase = { 
      rpc: vi.fn().mockResolvedValue({ data: [] }) 
    } as any;

    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase
    }));

    const res = await fetchNearestVenue({ lat: 0, lng: 0 });
    expect(res).toBeNull();
  });

  it('throws error when RPC fails', async () => {
    const mockSupabase = { 
      rpc: vi.fn().mockResolvedValue({ 
        error: { message: 'RPC failed' } 
      }) 
    } as any;

    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase
    }));

    await expect(fetchNearestVenue({ lat: 34.0, lng: -118.2 }))
      .rejects.toEqual({ message: 'RPC failed' });
  });
});