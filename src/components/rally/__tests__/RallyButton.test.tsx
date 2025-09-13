/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, beforeEach, expect } from 'vitest'
import * as React from 'react'
import { RallyButton } from '../RallyButton'

// --- mocks ---
const createRallyMock = vi.fn().mockResolvedValue({ rallyId: 'r_solo', invited: 0 })
const toastMock = vi.fn()

vi.mock('@/lib/api/rally', () => ({
  createRally: (...args: any[]) => createRallyMock(...args),
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

describe('RallyButton', () => {
  it('is hidden if not eligible AND allowSolo=false (cooldown active)', () => {
    // cooldown blocks standard eligibility
    render(
      <RallyButton
        lastPingAtMs={Date.now()} // <= 10m hits cooldown
        allowSolo={false}
        recipientIds={[]}
        note="Solo"
      />
    )
    // No chip rendered
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders when allowSolo=true even under cooldown', () => {
    render(
      <RallyButton
        lastPingAtMs={Date.now()} // cooldown
        allowSolo
        recipientIds={[]}
        note="Solo"
      />
    )
    // Chip appears with accessible label
    const btn = screen.getByRole('button', { name: /rally/i })
    expect(btn).toBeInTheDocument()
  })

  it('prevents double-create while busy and calls createRally exactly once', async () => {
    // Slow the first call to catch double-taps
    createRallyMock.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ rallyId: 'r1', invited: 0 }), 120)),
    )

    render(<RallyButton allowSolo recipientIds={[]} note="Solo" />)
    const btn = screen.getByRole('button', { name: /rally/i })

    fireEvent.click(btn)
    fireEvent.click(btn) // second click ignored because busy

    await waitFor(() => expect(createRallyMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rally created' }),
    )
  })
})