import { publishPresence } from '@/lib/presence/publishPresence';
import { supabase } from '@/integrations/supabase/client';
import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
    },
  },
}));

describe('publishPresence', () => {
  afterEach(() => {
    vi.mocked(supabase.functions.invoke).mockClear();
  });

  it('calls upsert-presence edge function with correct args', async () => {
    const result = await publishPresence(34, -118, 'excited');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('upsert-presence', {
      body: {
        lat: 34,
        lng: -118,
        vibe: 'excited',
        visibility: 'public',
        venue_id: null,
      },
    });
    expect(result).toEqual({ ok: true });
  });

  it('returns error result when edge function fails', async () => {
    const mockError = { status: 500, message: 'Server error' };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ error: mockError, data: null });

    const result = await publishPresence(34, -118, 'excited');
    
    expect(result).toEqual({ ok: false, reason: 'Server error' });
  });

  it('handles rate limit gracefully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ 
      data: { ok: false, reason: 'rate_limit', retryAfterSec: 15 }, 
      error: null 
    });

    const result = await publishPresence(34, -118, 'excited');
    
    expect(result).toEqual({ ok: false, reason: 'rate_limit', retryAfterSec: 15 });
  });
});