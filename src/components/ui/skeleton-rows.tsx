import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonRowsProps {
  rows?: number;
  className?: string;
}

export function SkeletonRows({ rows = 3, className }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div 
          key={i} 
          className={cn("h-6 mb-2 rounded bg-muted/20 animate-pulse", className)} 
        />
      ))}
    </>
  );
}