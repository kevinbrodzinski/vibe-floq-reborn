import type { InfiniteData } from '@tanstack/react-query';

export function flatInfinite<P, T = P>(data: InfiniteData<P> | undefined, mapFn?: (p: P) => T[]): T[] {
  if (!data?.pages) return [];
  return mapFn ? data.pages.flatMap(mapFn) : (data.pages as unknown as T[]);
}