// tests/onboarding/vibe-step.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { OnboardingVibeStep } from '@/components/onboarding/steps/OnboardingVibeStep'

// ---------- mocks --------------------------------------------------

// 1️⃣  toast hook – factory returns a *new* fn each time the test file loads
vi.mock('@/hooks/use-toast', () => {
  const mockToast = vi.fn()
  return { useToast: () => ({ toast: mockToast }) }
})

// 2️⃣  framer-motion shim
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
}))

// 3️⃣  MobileOptimizedButton shim
vi.mock('@/components/mobile/MobileOptimizedButton', () => ({
  MobileOptimizedButton: ({ children, ...p }: any) => <button {...p}>{children}</button>,
}))

// ---------- tests --------------------------------------------------

describe('OnboardingVibeStep', () => {
  const baseProps = {
    selectedVibe: null,
    onVibeSelect: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders 10 vibe option buttons', () => {
    render(<OnboardingVibeStep {...baseProps} />)

    const buttons = screen
      .getAllByRole('button')
      .filter(b => b.textContent && /😌|⚡|🤔|🎉|🧘|💕|🤪|😔|🌊|🌈/.test(b.textContent))

    expect(buttons).toHaveLength(10)
  })

  it('shows toast when continuing with invalid vibe', () => {
    const { toast } = require('@/hooks/use-toast').useToast()

    render(<OnboardingVibeStep {...baseProps} selectedVibe="chaotic" />)

    fireEvent.click(screen.getByText('Continue'))

    expect(toast).toHaveBeenCalledWith({
      title: 'Invalid vibe selected',
      description: 'Please pick one of the listed vibe options.',
      variant: 'destructive',
    })
  })

  it('shows toast when continuing without selecting a vibe', () => {
    const { toast } = require('@/hooks/use-toast').useToast()

    render(<OnboardingVibeStep {...baseProps} />)

    fireEvent.click(screen.getByText('Continue'))

    expect(toast).toHaveBeenCalledWith({
      title: 'Pick a vibe first',
      variant: 'destructive',
    })
  })

  it('calls onNext when a valid vibe is selected', () => {
    const props = { ...baseProps, selectedVibe: 'chill' as const }

    render(<OnboardingVibeStep {...props} />)

    fireEvent.click(screen.getByText('Continue'))

    expect(props.onNext).toHaveBeenCalled()
  })
})