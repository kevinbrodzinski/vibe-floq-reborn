import { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  start?: number;
  className?: string;
}

export function CountUp({ end, duration = 1000, start = 0, className }: CountUpProps) {
  const [count, setCount] = useState(start);
  const rafRef = useRef<number>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Prevent race condition if component unmounts before animation completes
    if (!mountedRef.current) return;

    let startTime: number;

    const animate = (timestamp: number) => {
      if (!mountedRef.current) return;
      
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Improved spring easing with bounce reduction
      const easeOutQuart = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(start + (end - start) * easeOutQuart);
      
      setCount(currentCount);

      if (progress < 1 && mountedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration, start]);

  return <span className={className}>{count}</span>;
}