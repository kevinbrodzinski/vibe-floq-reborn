import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  count?: number;
  className?: string;
  title?: string;
  'aria-label'?: string;
};

export function RallyUnreadBadge({
  count = 0,
  className,
  title = 'Unread items',
  'aria-label': ariaLabel = 'Unread items',
}: Props) {
  if (!count || count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`${ariaLabel}: ${display}`}
      title={title}
      className={cn(
        'inline-flex min-w-[1.5rem] items-center justify-center rounded-full',
        'bg-destructive text-destructive-foreground',
        'px-2 py-0.5 text-xs font-semibold leading-none',
        className
      )}
    >
      {display}
    </span>
  );
}