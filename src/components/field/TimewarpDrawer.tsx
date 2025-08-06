import React from 'react';
import { X, Clock } from 'lucide-react';
import { useTimewarpDrawer } from '@/contexts/TimewarpDrawerContext';
import { TimewarpControls } from './TimewarpControls';
import { Button } from '@/components/ui/button';

export const TimewarpDrawer = () => {
  const { open, close } = useTimewarpDrawer();

  return (
    <div className={`
      w-full max-w-screen-sm pointer-events-auto
      transition-transform duration-300 ease-out
      ${open ? 'translate-y-0' : 'translate-y-[110%]'}
    `}>
      <div className="
        rounded-t-xl bg-background/95 backdrop-blur-sm shadow-lg border border-border
        border-b-0
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Time-Warp Playback</h3>
              <p className="text-xs text-muted-foreground">Replay your location history</p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={close}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <TimewarpControls />
      </div>
    </div>
  );
};