import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

import { useClusterVenues } from '@/hooks/useClusterVenues';

// ────────────────────────────────────────────────────────────
// Helper: each test gets an isolated QueryClient instance
// ────────────────────────────────────────────────────────────
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ───────────────────────── Tests ────────────────────────────
test('returns array even when bounds is null', async () => {
  const { result } = renderHook(() => useClusterVenues(null), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toEqual([]);
  });
});

test('handles valid bounds input', async () => {
  const bounds: [number, number, number, number] = [-1, -1, 1, 1];

  const { result } = renderHook(() => useClusterVenues(bounds), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});