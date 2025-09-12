import * as React from 'react';
import { layerManager } from '@/lib/map/LayerManager';

export function MapOverlayStats() {
  const [stats, setStats] = React.useState<Record<string, number>>({});
  
  React.useEffect(() => {
    const id = setInterval(() => setStats(layerManager.getStats()), 500);
    return () => clearInterval(id);
  }, []);

  if (Object.keys(stats).length === 0) return null;

  return (
    <div className="fixed left-2 top-2 z-[9999] rounded-md bg-black/60 text-white text-[11px] px-2 py-1 pointer-events-none">
      <div className="font-semibold mb-1">Layer Updates</div>
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <span>{k}:</span>
          <span className="font-mono">{v}</span>
        </div>
      ))}
    </div>
  );
}