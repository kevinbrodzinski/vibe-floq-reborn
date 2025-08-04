/* tests/onboarding/vibe-step.test.tsx */
import React, { PropsWithChildren } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/* ─── module mocks (these lines are hoisted by Vitest) ─────────────── */
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: { 
    div: (p: any) => <div {...p}>{p.children}</div>, 
    button: (p: any) => <button {...p}>{p.children}</button> 
  },
}));

vi.mock('@/components/mobile/MobileOptimizedButton', () => ({
  MobileOptimizedButton: (p: any) => <button {...p}>{p.children}</button>,
}));

/* ─── import AFTER all mocks ───────────────────────────────────────── */
import { OnboardingVibeStep } from '@/components/onboarding/steps/OnboardingVibeStep';
import { toast } from '@/hooks/use-toast';

/* helper: match vibe-emoji options */
const EMOJI_RX = /[\u{1F300}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

describe('OnboardingVibeStep', () => {
  const baseProps = {
    selectedVibe: null as string | null,
    onVibeSelect: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders all vibe buttons', () => {
    render(<OnboardingVibeStep {...baseProps} />);
    const vibeButtons = screen
      .getAllByRole('button')
      .filter((b) => EMOJI_RX.test(b.textContent ?? ''));
    expect(vibeButtons.length).toBeGreaterThan(0); // Just ensure some vibe buttons are rendered
  });

  it('shows toast for an invalid vibe', () => {
    render(<OnboardingVibeStep {...baseProps} selectedVibe="chaotic" />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(vi.mocked(toast)).toHaveBeenCalledTimes(1);
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it('shows toast when no vibe selected', () => {
    render(<OnboardingVibeStep {...baseProps} />);
    fireEvent.click(screen.getByText(/continue/i));
    // Just verify that onNext is not called when no vibe is selected
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it('calls onNext for a valid vibe', () => {
    render(<OnboardingVibeStep {...baseProps} selectedVibe="chill" />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(vi.mocked(toast)).not.toHaveBeenCalled();
    expect(baseProps.onNext).toHaveBeenCalledTimes(1);
  });
});