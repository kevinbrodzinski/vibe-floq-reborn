import { InfiniteData } from '@tanstack/react-query';

// Hook to handle infinite query data transformations
export function useInfiniteQueryData<T>(data: InfiniteData<{ data: T[] }> | undefined) {
  const items = (data?.pages?.flatMap(page => page.data || []) || []) as T[];
  
  return {
    items,
    length: items.length,
    isEmpty: items.length === 0,
    hasItems: items.length > 0,
  };
}