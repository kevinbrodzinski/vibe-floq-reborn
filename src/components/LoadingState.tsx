import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  variant?: 'spinner' | 'skeleton' | 'pulse';
}

export const LoadingState = ({ 
  size = 'md', 
  text, 
  className,
  variant = 'spinner'
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (variant === 'skeleton') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("w-full h-24 bg-muted animate-pulse rounded-lg", className)} />
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground text-center">{text}</p>
      )}
    </div>
  );
};