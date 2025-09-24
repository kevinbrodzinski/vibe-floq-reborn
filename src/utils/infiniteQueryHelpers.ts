import { InfiniteData } from '@tanstack/react-query';

// Helper to flatten InfiniteQuery data into a single array
export function flattenInfiniteData<T>(data: InfiniteData<{ data: T[] }> | undefined): T[] {
  if (!data?.pages) return [];
  return data.pages.flatMap(page => page.data || []);
}

// Helper to get the length of flattened InfiniteQuery data
export function getInfiniteDataLength<T>(data: InfiniteData<{ data: T[] }> | undefined): number {
  return flattenInfiniteData(data).length;
}

// Helper to slice flattened InfiniteQuery data
export function sliceInfiniteData<T>(data: InfiniteData<{ data: T[] }> | undefined, start: number, end?: number): T[] {
  return flattenInfiniteData(data).slice(start, end);
}