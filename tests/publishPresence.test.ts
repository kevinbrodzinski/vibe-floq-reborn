import { publishPresence } from '@/lib/presence/publishPresence';
import { supabase } from '@/integrations/supabase/client';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

describe('publishPresence', () => {
  it('calls upsert_presence with correct args', async () => {
    await publishPresence(34, -118, 'excited');

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_presence', {
      p_lat: 34,
      p_lng: -118,
      p_vibe: 'excited',
      p_visibility: 'public',
    });
  });

  it('throws error when RPC fails', async () => {
    const mockError = new Error('DB error');
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ error: mockError });

    await expect(publishPresence(34, -118, 'excited')).rejects.toThrow('DB error');
  });
});