import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppAccessGuard } from '@/components/auth/AppAccessGuard';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useOnboardingStatus');
vi.mock('@/hooks/useDeepLinkRedirect');
vi.mock('@/hooks/useSafeStorage');

const mockUseAuth = vi.mocked(useAuth);
const mockUseOnboardingStatus = vi.mocked(useOnboardingStatus);

// Mock other dependencies
vi.mock('@/components/auth/AuthScreen', () => ({
  AuthScreen: () => <div data-testid="auth-screen">Auth Screen</div>
}));

vi.mock('@/components/onboarding/EnhancedOnboardingScreen', () => ({
  EnhancedOnboardingScreen: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="onboarding-screen">
      <button onClick={onComplete} data-testid="complete-onboarding">
        Complete Onboarding
      </button>
    </div>
  )
}));

vi.mock('@/components/visual/SplashScreen', () => ({
  SplashScreen: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="splash-screen">
      <button onClick={onComplete} data-testid="complete-splash">
        Complete Splash
      </button>
    </div>
  )
}));

vi.mock('@/hooks/useDeepLinkRedirect', () => ({
  useDeepLinkRedirect: () => ({
    getRedirectPath: vi.fn().mockResolvedValue(null),
    clearRedirectPath: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('@/hooks/useSafeStorage', () => ({
  useSafeStorage: () => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined)
  })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AppAccessGuard - Onboarding Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows auth screen when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      session: null,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      networkError: false
    });

    mockUseOnboardingStatus.mockReturnValue({
      needsOnboarding: false,
      isLoading: false,
      currentVersion: 'v2',
      markCompleted: vi.fn()
    });

    render(
      <TestWrapper>
        <AppAccessGuard>
          <div data-testid="main-app">Main App</div>
        </AppAccessGuard>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
    });
  });

  it('shows onboarding when user is authenticated but needs onboarding', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' } as any,
      loading: false,
      session: {} as any,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      networkError: false
    });

    mockUseOnboardingStatus.mockReturnValue({
      needsOnboarding: true,
      isLoading: false,
      currentVersion: 'v2',
      markCompleted: vi.fn()
    });

    render(
      <TestWrapper>
        <AppAccessGuard>
          <div data-testid="main-app">Main App</div>
        </AppAccessGuard>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
    });
  });

  it('shows main app when user is authenticated and onboarding is complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' } as any,
      loading: false,
      session: {} as any,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      networkError: false
    });

    mockUseOnboardingStatus.mockReturnValue({
      needsOnboarding: false,
      isLoading: false,
      currentVersion: 'v2',
      markCompleted: vi.fn()
    });

    render(
      <TestWrapper>
        <AppAccessGuard>
          <div data-testid="main-app">Main App</div>
        </AppAccessGuard>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('main-app')).toBeInTheDocument();
    });
  });

  it('shows loading state when auth or onboarding status is loading', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      session: null,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      networkError: false
    });

    mockUseOnboardingStatus.mockReturnValue({
      needsOnboarding: false,
      isLoading: false,
      currentVersion: 'v2',
      markCompleted: vi.fn()
    });

    render(
      <TestWrapper>
        <AppAccessGuard>
          <div data-testid="main-app">Main App</div>
        </AppAccessGuard>
      </TestWrapper>
    );

    expect(screen.getByText('Loading your progress...')).toBeInTheDocument();
  });
});