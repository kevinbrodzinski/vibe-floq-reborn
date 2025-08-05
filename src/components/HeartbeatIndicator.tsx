import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartbeatIndicatorProps {
  lastHeartbeat?: number;
  className?: string;
}

export const HeartbeatIndicator = ({ lastHeartbeat, className }: HeartbeatIndicatorProps) => {
  const [isStale, setIsStale] = useState(false);
  
  useEffect(() => {
    if (!lastHeartbeat) return;
    
    const checkHeartbeat = () => {
      const timeSinceLastBeat = Date.now() - lastHeartbeat;
      setIsStale(timeSinceLastBeat > 15000); // 15 seconds
    };
    
    checkHeartbeat();
    const interval = setInterval(checkHeartbeat, 1000);
    
    return () => clearInterval(interval);
  }, [lastHeartbeat]);

  if (!lastHeartbeat) return null;

  return (
    <div className={cn(
      "flex items-center justify-center w-6 h-6 rounded-full",
      isStale ? "bg-destructive/20" : "bg-primary/20",
      className
    )}>
      <Wifi className={cn(
        "w-3 h-3 transition-colors duration-300",
        isStale ? "text-destructive animate-pulse" : "text-primary animate-ping"
      )} />
    </div>
  );
};