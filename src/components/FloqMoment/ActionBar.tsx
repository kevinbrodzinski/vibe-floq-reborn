import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type ActionBarProps = {
  onJoin?: () => void;
  onShareLocation?: () => void;
  onInvite?: () => void;
  onSaveRipple?: () => void;
};

export default function ActionBar({ onJoin, onShareLocation, onInvite, onSaveRipple }: ActionBarProps) {
  return (
    <div className="p-3 space-y-2 border-t">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onJoin}>Join Now</Button>
        <Button onClick={onShareLocation} variant="outline">Share Location</Button>
        <Button onClick={onInvite} variant="secondary">Invite Friend</Button>
        <Button onClick={onSaveRipple} variant="default">Save as Ripple</Button>
      </div>
      <Separator />
    </div>
  );
}