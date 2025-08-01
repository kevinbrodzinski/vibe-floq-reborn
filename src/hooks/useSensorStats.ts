import * as React from 'react';
import { AppState } from 'react-native';

/* Mock sensor-strip stats for Personal mode. */
export const useSensorStats = () => {
  const [stats, setStats] = React.useState({
    auto: true,
    accuracy: 0.56,
    sound: 58,
  });

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const startInterval = () => {
      intervalId = setInterval(() => {
        setStats((s) => ({
          ...s,
          accuracy: Math.max(0.4, Math.min(0.9, s.accuracy + (Math.random() - 0.5) * 0.05)),
          sound: 55 + Math.floor(Math.random() * 8),
        }));
      }, 5000);
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        startInterval();
      } else {
        clearInterval(intervalId);
      }
    };

    // Start immediately if app is active
    if (AppState.currentState === 'active') {
      startInterval();
    }

    // Handle different AppState API versions
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(intervalId);
      if (subscription && typeof subscription === 'object' && 'remove' in subscription) {
        (subscription as any).remove();
      }
    };
  }, []);

  return stats;
};