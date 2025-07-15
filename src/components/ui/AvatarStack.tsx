import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AvatarStackProps {
  urls: (string | null)[];   // allow Nulls - we'll fall back to initials
  names?: string[];          // friend names for tooltips
  size?: number;             // px – outer diameter
  max?: number;              // max avatars shown before "+N"
  className?: string;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  urls,
  names = [],
  size = 28,
  max = 4,
  className,
}) => {
  const visible = urls.slice(0, max);
  const hidden = Math.max(urls.length - max, 0);
  const visibleNames = names.slice(0, max).filter(Boolean);
  const tooltipText = visibleNames.length > 0 ? visibleNames.join(', ') : '';

  const content = (
    <div className={cn('flex items-center', className)} tabIndex={0}>
      <div className="flex -space-x-2">
        {visible.map((url, i) => 
          url ? (
            <img
              key={i}
              src={url}
              alt={names[i] ?? ''}
              width={size}
              height={size}
              className="rounded-full ring-2 ring-background -ml-2 first:ml-0"
              loading="lazy"
            />
          ) : (
            <span
              key={i}
              aria-label={names[i] ?? ''}
              className="flex items-center justify-center bg-muted text-xs font-medium rounded-full ring-2 ring-background -ml-2 first:ml-0"
              style={{ 
                width: size, 
                height: size, 
                fontSize: Math.max(size * 0.4, 10) 
              }}
            >
              {(names[i]?.[0]?.toUpperCase() ?? '?')}
            </span>
          )
        )}
      </div>
      {hidden > 0 && (
        <span
          className="text-xs font-medium bg-muted rounded-full px-1 -ml-2 ring-2 ring-background"
          style={{ minWidth: size - 8 }}
        >
          +{hidden}
        </span>
      )}
    </div>
  );

  if (tooltipText && visible.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};