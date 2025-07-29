// tests/onboarding/vibe-step.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 🟡 1 ▸ mock use-toast BEFORE importing the component
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => {
  return {
    useToast: () => ({ toast: mockToast }),
  };
});

// 🟡 2 ▸ stub framer-motion & MobileOptimizedButton
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));
vi.mock('@/components/mobile/MobileOptimizedButton', () => ({
  MobileOptimizedButton: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

// ✅ now import the component (after mocks)
import { OnboardingVibeStep } from '@/components/onboarding/steps/OnboardingVibeStep';

describe('OnboardingVibeStep', () => {
  const baseProps = {
    selectedVibe: null,
    onVibeSelect: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 10 vibe option buttons', () => {
    render(<OnboardingVibeStep {...baseProps} />);
    const buttons = screen.getAllByRole('button').filter(
      (b) => b.textContent && b.textContent.match(/[😌⚡🤔🎉🧘💕🤪😔🌊🌈]/)
    );
    expect(buttons).toHaveLength(10);
  });

  it('shows toast when continuing with invalid vibe', () => {
    render(<OnboardingVibeStep {...baseProps} selectedVibe="chaotic" />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(mockToast).toHaveBeenCalled();
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it('shows toast when continuing with no vibe', () => {
    render(<OnboardingVibeStep {...baseProps} />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(mockToast).toHaveBeenCalled();
    expect(baseProps.onNext).not.toHaveBeenCalled();
  });

  it('calls onNext when valid vibe selected', () => {
    render(<OnboardingVibeStep {...baseProps} selectedVibe="chill" />);
    fireEvent.click(screen.getByText(/continue/i));
    expect(mockToast).not.toHaveBeenCalled();
    expect(baseProps.onNext).toHaveBeenCalled();
  });
});