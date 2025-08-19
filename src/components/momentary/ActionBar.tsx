import * as React from 'react';
import { Button } from '@/components/ui/button';
import { InviteButton } from './InviteButton';
import { cn } from '@/lib/utils';

export type ActionBarProps = {
  floqId: string;
  onJoin?: () => Promise<void> | void;
  onShareLocation?: () => Promise<void> | void;
  onSaveRipple?: () => Promise<void> | void;
  className?: string;
};

export function ActionBar({ floqId, onJoin, onShareLocation, onSaveRipple, className }: ActionBarProps) {
  return (
    <div className={cn('sticky bottom-0 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3', className)}>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onJoin}>Join Now</Button>
        <Button variant="secondary" onClick={onShareLocation}>Share Location</Button>
        <InviteButton floqId={floqId} />
        <Button variant="default" onClick={onSaveRipple}>Save as Ripple</Button>
      </div>
    </div>
  );
}