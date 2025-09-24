/**
 * @vitest-environment node
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
  },
}))

import { createRallyInboxThread } from '../rallyInbox'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createRallyInboxThread', () => {
  it('returns thread id on success', async () => {
    invokeMock.mockResolvedValueOnce({ data: { threadId: 'th_123' }, error: null })

    const res = await createRallyInboxThread({
      rallyId: 'r1',
      title: 'Rally near you',
      participants: [],        // solo is allowed
      centroid: { lng: -118.49, lat: 34.0 },
    })

    expect(invokeMock).toHaveBeenCalledWith('rally-inbox-create', {
      body: {
        rallyId: 'r1',
        title: 'Rally near you',
        participants: [],
        centroid: { lng: -118.49, lat: 34.0 },
      },
    })
    expect(res.threadId).toBe('th_123')
  })

  it('falls back to local thread id if edge function fails', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const res = await createRallyInboxThread({
      rallyId: 'r2',
      title: 'Solo Rally',
      participants: [],
      centroid: { lng: -118.49, lat: 34.0 },
    })

    expect(res.threadId).toMatch(/^rthread_/)
  })
})