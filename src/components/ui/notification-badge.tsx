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
      className={cn(
        "bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium shadow-sm",
        showPulse && "animate-pulse",
        className
      )}
      aria-label={`${children} unread`}
    >
      {children}
    </span>
  );
};