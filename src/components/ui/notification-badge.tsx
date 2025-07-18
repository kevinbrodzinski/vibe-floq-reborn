import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  children: React.ReactNode;
  className?: string;
  showPulse?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  children,
  className,
  showPulse = false 
}) => {
  return (
    <span 
      data-badge
      className={cn(
        "min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs leading-none flex items-center justify-center",
        showPulse && "animate-pulse",
        className
      )}
      aria-label={`${children} unread`}
      {...(typeof children === 'number' && children > 0 ? { 'aria-label': `${children} unread` } : {})}
    >
      {children}
    </span>
  );
};