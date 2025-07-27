import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OnboardingVibeStep } from '@/components/onboarding/steps/OnboardingVibeStep';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock MobileOptimizedButton
vi.mock('@/components/mobile/MobileOptimizedButton', () => ({
  MobileOptimizedButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('OnboardingVibeStep', () => {
  const mockProps = {
    selectedVibe: null,
    onVibeSelect: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 10 vibe option buttons', () => {
    render(<OnboardingVibeStep {...mockProps} />);
    
    // Get all buttons that are vibe options (excluding Back/Continue buttons)
    const vibeButtons = screen.getAllByRole('button').filter(button => 
      button.textContent?.includes('😌') || // chill
      button.textContent?.includes('⚡') || // hype
      button.textContent?.includes('🤔') || // curious
      button.textContent?.includes('🎉') || // social
      button.textContent?.includes('🧘') || // solo
      button.textContent?.includes('💕') || // romantic
      button.textContent?.includes('🤪') || // weird
      button.textContent?.includes('😔') || // down
      button.textContent?.includes('🌊') || // flowing
      button.textContent?.includes('🌈')    // open
    );
    
    expect(vibeButtons).toHaveLength(10);
  });

  it('shows toast when continuing with invalid vibe selected', () => {
    const propsWithInvalidVibe = {
      ...mockProps,
      selectedVibe: 'chaotic', // invalid vibe not in enum
    };
    
    render(<OnboardingVibeStep {...propsWithInvalidVibe} />);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Invalid vibe selected',
      description: 'Please pick one of the listed vibe options.',
      variant: 'destructive',
    });
    
    expect(mockProps.onNext).not.toHaveBeenCalled();
  });

  it('shows toast when continuing without selecting a vibe', () => {
    render(<OnboardingVibeStep {...mockProps} />);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Pick a vibe first',
      variant: 'destructive',
    });
    
    expect(mockProps.onNext).not.toHaveBeenCalled();
  });

  it('calls onNext when valid vibe is selected', () => {
    const propsWithValidVibe = {
      ...mockProps,
      selectedVibe: 'chill', // valid vibe from enum
    };
    
    render(<OnboardingVibeStep {...propsWithValidVibe} />);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockProps.onNext).toHaveBeenCalled();
  });
});