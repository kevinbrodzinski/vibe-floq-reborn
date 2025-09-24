import React from 'react';
import { Button } from '@/components/ui/button';

export type ActionBarProps = {
  onJoin?: () => void;
  onShareLocation?: () => void;
  onInvite?: () => void;
  onSaveRipple?: () => void;
};

export default function ActionBar({ onJoin, onShareLocation, onInvite, onSaveRipple }: ActionBarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 border-t border-border">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onJoin} className="flex-1 min-w-[120px]">
          Join Now
        </Button>
        <Button variant="secondary" onClick={onShareLocation} className="flex-1 min-w-[120px]">
          Share Location
        </Button>
        <Button variant="outline" onClick={onInvite} className="flex-1 min-w-[120px]">
          Invite Friend
        </Button>
        <Button variant="default" onClick={onSaveRipple} className="flex-1 min-w-[120px]">
          Save as Ripple
        </Button>
      </div>
    </div>
  );
}