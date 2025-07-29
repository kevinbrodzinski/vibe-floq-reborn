import { renderHook, waitFor } from '@testing-library/react';
import { useClusterVenues } from '@/hooks/useClusterVenues';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('returns array even when bounds undefined', async () => {
  const { result } = renderHook(() => useClusterVenues(null), {
    wrapper: createWrapper(),
  });
  
  await waitFor(() => {
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data).toEqual([]);
  });
});

test('handles valid bounds input', () => {
  const bounds: [number, number, number, number] = [-1, -1, 1, 1];
  
  const { result } = renderHook(() => useClusterVenues(bounds), {
    wrapper: createWrapper(),
  });
  
  expect(Array.isArray(result.current.data)).toBe(true);
});