import { useTimeWarp } from '@/lib/timeWarp';

export const TimeScrubber = () => {
  const { t, set } = useTimeWarp();
  const hoursAgo = t ? Math.round((Date.now() - t.getTime()) / 3.6e6) : 0;

  return (
    <div className="fixed bottom-4 w-[260px] left-1/2 -translate-x-1/2 z-[60] bg-background/80 backdrop-blur-sm border rounded-lg p-3">
      <input 
        type="range"
        min="0" 
        max="24" 
        step="1"
        value={hoursAgo}
        onChange={(e) => {
          const h = Number(e.target.value);
          set(h ? new Date(Date.now() - h * 3.6e6) : undefined);
        }}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="text-center text-xs mt-2">
        {hoursAgo === 0 ? (
          <span className="text-green-500 font-medium">🔴 LIVE</span>
        ) : (
          <span className="text-muted-foreground">
            ⏪ {String(hoursAgo).padStart(2, '0')}:00 ago
          </span>
        )}
      </div>
    </div>
  );
};