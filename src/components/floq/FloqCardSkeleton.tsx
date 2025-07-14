import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FloqCardSkeletonProps {
  className?: string;
}

export const FloqCardSkeleton: React.FC<FloqCardSkeletonProps> = ({ className }) => {
  return (
    <article
      className={cn(
        'group relative overflow-hidden card-glass',
        'rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,.45)] ring-1 ring-white/10',
        className
      )}
      aria-label="Loading floq card"
    >
      {/* Radial glow skeleton */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 bg-gradient-to-br from-muted/20 to-muted/5"
        aria-hidden="true"
      />

      {/* Top-right vibe pill skeleton */}
      <Skeleton className="absolute top-3 right-3 h-5 w-16 rounded-full" />

      {/* Top-left status badges skeleton */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <Skeleton className="h-4 w-8 rounded-full" />
      </div>

      {/* Bottom-right corner badges skeleton */}
      <div className="absolute bottom-3 right-3">
        <Skeleton className="h-4 w-10 rounded-full" />
      </div>

      {/* Row 1: avatar stack + title skeleton */}
      <div className="relative z-10 flex items-start gap-4">
        {/* Avatar stack skeleton */}
        <div className="relative flex items-center mt-0.5">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="ml-2 flex -space-x-2">
            <Skeleton className="h-6 w-6 rounded-full border-2 border-white/20" />
            <Skeleton className="h-6 w-6 rounded-full border-2 border-white/20" />
            <Skeleton className="h-6 w-6 rounded-full border-2 border-white/20" />
          </div>
        </div>
        
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Description skeleton */}
      <div className="relative z-10 mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Meta row skeleton */}
      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Action row skeleton */}
      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>

      {/* Swipe hint skeleton */}
      <div className="w-full mt-2 flex items-center gap-1 justify-center md:hidden">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </article>
  );
};