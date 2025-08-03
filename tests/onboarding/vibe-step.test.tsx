/* tests/onboarding/vibe-step.test.tsx */
import React, { PropsWithChildren } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/* ─── helper FIRST (must exist before mocks are evaluated) ──────────── */
const stub =
  <T extends keyof JSX.IntrinsicElements>(Tag: T) =>
    (p: JSX.IntrinsicElements[T] & PropsWithChildren) =>
      /* eslint-disable @typescript-eslint/no-explicit-any */
      <Tag {...p}>{p.children}</Tag>;

/* ─── module mocks (these lines are hoisted by Vitest) ─────────────── */
const toastSpy = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: stub('div'), button: stub('button') },
}));

vi.mock('@/components/mobile/MobileOptimizedButton', () => ({
  MobileOptimizedButton: stub('button'),
}));

/* ─── import AFTER all mocks ───────────────────────────────────────── */
import { OnboardingVibeStep } from '@/components/onboarding/steps/OnboardingVibeStep';

/* helper: match any of the 10 vibe-emoji options */
const EMOJI_RX = /[😌⚡🤔🎉🧘💕🤪😔🌊🌈]/u;

describe('OnboardingVibeStep', () => {
  const baseProps = {
    selectedVibe: null as string | null,
    onVibeSelect: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders exactly ten vibe buttons', () => {
    render(<OnboardingVibeStep {...baseProps} />);
    const vibeButtons = screen
      .getAllByRole('button')
      .filter((b) => EMOJI_RX.test(b.textContent ?? ''));
    expect(vibeButtons).toHaveLength(10);
  });

  it('shows toast for an invalid vibe', () => {
    render(<OnboardingVibeStep {...baseProps} selectedVibe="chaotic" />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it('shows toast when no vibe selected', () => {
    render(<OnboardingVibeStep {...baseProps} />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it('calls onNext for a valid vibe', () => {
    render(<OnboardingVibeStep {...baseProps} selectedVibe="chill" />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(toastSpy).not.toHaveBeenCalled();
    expect(baseProps.onNext).toHaveBeenCalledTimes(1);
  });
});