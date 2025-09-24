import React, { useEffect, useRef } from 'react';

/**
 * Debug component to monitor breathing system performance
 */
export const BreathingSystemDebug: React.FC = () => {
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (statsRef.current && (window as any).__breathingSystem) {
        const stats = (window as any).__breathingSystem.getStats();
        statsRef.current.innerHTML = `
          <div>Active Breathing States: ${stats.activeBreathingStates}</div>
          <div>Active Particles: ${stats.activeParticles}</div>
          <div>Glow Sprites: ${stats.glowSprites}</div>
          <div>Pool Available: ${stats.particlePoolAvailable}</div>
        `;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg p-4 text-xs">
      <h3 className="font-medium mb-2">Breathing System Stats</h3>
      <div ref={statsRef}>No data</div>
    </div>
  );
};