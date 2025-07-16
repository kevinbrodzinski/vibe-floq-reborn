import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineItemProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineSeparatorProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineDotProps {
  sx?: { backgroundColor?: string };
  className?: string;
}

interface TimelineConnectorProps {
  className?: string;
}

interface TimelineContentProps {
  children: React.ReactNode;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ children, className }) => {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
};

export const TimelineItem: React.FC<TimelineItemProps> = ({ children, className }) => {
  return (
    <div className={cn("relative flex gap-4 pb-8 last:pb-0", className)}>
      {children}
    </div>
  );
};

export const TimelineSeparator: React.FC<TimelineSeparatorProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {children}
    </div>
  );
};

export const TimelineDot: React.FC<TimelineDotProps> = ({ sx, className }) => {
  const backgroundColor = sx?.backgroundColor || "#6b7280";
  
  return (
    <div 
      className={cn("w-3 h-3 rounded-full border-2 border-background", className)}
      style={{ backgroundColor }}
    />
  );
};

export const TimelineConnector: React.FC<TimelineConnectorProps> = ({ className }) => {
  return (
    <div className={cn("w-0.5 h-8 bg-border mt-1", className)} />
  );
};

export const TimelineContent: React.FC<TimelineContentProps> = ({ children, className }) => {
  return (
    <div className={cn("flex-1 min-w-0", className)}>
      {children}
    </div>
  );
};