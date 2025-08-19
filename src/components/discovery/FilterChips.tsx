import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function FilterChips({ 
  radiusM, 
  onRadiusChange, 
  onRefresh 
}: { 
  radiusM: number; 
  onRadiusChange: (m: number) => void; 
  onRefresh: () => void; 
}) {
  const opts = [500, 1000, 1500, 2500, 4000];
  
  return (
    <div className="flex gap-2 flex-wrap">
      {opts.map(m => (
        <Button 
          key={m} 
          size="sm" 
          variant={m === radiusM ? 'default' : 'outline'}
          onClick={() => onRadiusChange(m)}
        >
          {m < 1000 ? `${m} m` : `${m/1000} km`}
        </Button>
      ))}
      <Button size="sm" variant="secondary" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4 mr-1" />
        Refresh
      </Button>
    </div>
  );
}