import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface AnimatedBadgeProps {
  count: number;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  maxCount?: number;
  'aria-label'?: string;
  role?: string;
}

/**
 * Animated badge that pops in when count changes
 * Uses key prop to force re-render and trigger animation
 */
export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  count,
  className,
  variant = 'destructive',
  maxCount = 99,
  'aria-label': ariaLabel,
  role = 'status',
  ...props
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;
  const defaultAriaLabel = `${count} notification${count === 1 ? '' : 's'}`;

  return (
    <Badge
      key={count} // Force re-render to trigger animation
      variant={variant}
      className={cn('animate-pop', className)}
      role={role}
      aria-label={ariaLabel || defaultAriaLabel}
      {...props}
    >
      {displayCount}
    </Badge>
  );
};