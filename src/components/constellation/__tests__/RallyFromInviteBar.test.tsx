/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as React from 'react'
import { RallyFromInviteBar } from '../RallyFromInviteBar'

// --- Mocks ---
const createRallyMock = vi.fn().mockResolvedValue({ rallyId: 'rally_1' })
const createThreadMock = vi.fn().mockResolvedValue({ threadId: 'thread_1' })
const toastMock = vi.fn()

vi.mock('@/lib/api/rally', () => ({
  createRally: (...args: any[]) => createRallyMock(...args),
}))
vi.mock('@/lib/api/rallyInbox', () => ({
  createRallyInboxThread: (...args: any[]) => createThreadMock(...args),
}))
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))
vi.mock('@/lib/geo/mapSingleton', () => ({
  getCurrentMap: () => ({
    getCenter: () => ({ lng: -118.49, lat: 34.0 }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RallyFromInviteBar', () => {
  it('starts a rally using heads centroid (multi-person case)', async () => {
    const heads = [
      { friend_id: 'a', lng: -118.50, lat: 34.001, t_head: new Date().toISOString() },
      { friend_id: 'b', lng: -118.48, lat: 33.999, t_head: new Date().toISOString() },
    ]

    render(<RallyFromInviteBar heads={heads} cohesion01={0.6} />)

    const startBtn = await screen.findByRole('button', { name: /start rally/i })
    fireEvent.click(startBtn)

    await waitFor(() => expect(createRallyMock).toHaveBeenCalledTimes(1))
    const call = createRallyMock.mock.calls[0][0]
    expect(call.recipients).toEqual(['a', 'b'])
    // centroid ~= average(-118.50, -118.48) & (34.001, 33.999)
    expect(call.center.lng).toBeCloseTo(-118.49, 3)
    expect(call.center.lat).toBeCloseTo(34.0, 3)

    await waitFor(() => expect(createThreadMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rally started' }),
    )
  })

  it('starts a true solo rally with map-center fallback (no heads)', async () => {
    render(<RallyFromInviteBar heads={[]} cohesion01={0.2} />)

    const startBtn = await screen.findByRole('button', { name: /start rally/i })
    fireEvent.click(startBtn)

    await waitFor(() => expect(createRallyMock).toHaveBeenCalledTimes(1))
    const call = createRallyMock.mock.calls[0][0]
    // recipients are [] in solo path
    expect(call.recipients).toEqual([])
    // map center fallback from getCurrentMap mock
    expect(call.center).toEqual({ lng: -118.49, lat: 34.0 })
    expect(createThreadMock).toHaveBeenCalledTimes(1)
  })

  it('disables button while busy (no double fire)', async () => {
    createRallyMock.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ rallyId: 'rally_slow' }), 150)),
    )

    render(<RallyFromInviteBar heads={[]} cohesion01={0.2} />)

    const startBtn = await screen.findByRole('button', { name: /start rally/i })
    fireEvent.click(startBtn)
    fireEvent.click(startBtn) // second click ignored while busy

    // still exactly one call
    await waitFor(() => expect(createRallyMock).toHaveBeenCalledTimes(1))
  })
})