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
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-2">
        {visible.map((url, i) => (
          <div
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              'rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-xs font-medium text-background',
              !url && 'bg-primary'
            )}
          >
            {url ? (
              <img
                src={url}
                alt=""
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              '?' /* fallback */
            )}
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">+{hidden}</span>
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