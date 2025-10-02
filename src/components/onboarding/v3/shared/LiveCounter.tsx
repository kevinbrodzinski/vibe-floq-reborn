import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

/**
 * Live Counter - Real-time fluctuating user count
 * Creates FOMO with variable reward schedule
 */
export function LiveCounter() {
  const [count, setCount] = useState(23);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate between 23-50 users
      setCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + change;
        return Math.max(23, Math.min(50, newCount));
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="relative flex items-center">
        <Users className="h-4 w-4" />
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <span className="transition-all duration-500">
        <span className="font-medium text-foreground">{count}</span> people joining now
      </span>
    </div>
  );
}
