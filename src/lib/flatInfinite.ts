import type { InfiniteData } from '@tanstack/react-query';

export function flatInfinite<T>(pages: InfiniteData<T> | undefined): T[] {
  return pages?.pages
    ? pages.pages.flatMap(page => page as T[])
    : [];
}