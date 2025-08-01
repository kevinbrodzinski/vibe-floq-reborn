import * as React from 'react';

/* Mock sensor-strip stats for Personal mode. */
export const useSensorStats = () => {
  const [stats, setStats] = React.useState({
    auto: true,
    accuracy: 0.56,
    sound: 58,
  });

  React.useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => ({
        ...s,
        accuracy: Math.max(0.4, Math.min(0.9, s.accuracy + (Math.random() - 0.5) * 0.05)),
        sound: 55 + Math.floor(Math.random() * 8),
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return stats;
};