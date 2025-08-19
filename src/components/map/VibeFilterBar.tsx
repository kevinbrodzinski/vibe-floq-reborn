import React from 'react';
import { Button } from '@/components/ui/button';

// Minimal VibeFilterBar component to fix build error
// This was referenced by VibeDensityMap.tsx but was missing

interface VibeFilterBarProps {
  state?: any;
  helpers?: any;
}

export const VibeFilterBar: React.FC<VibeFilterBarProps> = ({ state, helpers }) => {
  return (
    <div className="flex gap-2 p-2">
      <Button size="sm" variant="outline">
        All Vibes
      </Button>
      {/* TODO: Implement actual vibe filtering if needed */}
    </div>
  );
};