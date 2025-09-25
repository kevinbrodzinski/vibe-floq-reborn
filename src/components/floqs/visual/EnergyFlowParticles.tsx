import * as React from "react";

export function EnergyFlowParticles({
  energy = 0.5, // 0..1
  peakRatio = 0, // 0..1 where we are relative to peak
  live = true,
  className = "",
}: {
  energy?: number;
  peakRatio?: number;
  live?: boolean;
  className?: string;
}) {
  // Only show if energy is above threshold
  if (energy < 0.3 && peakRatio < 0.6) return null;

  const intensity = Math.max(energy, peakRatio);
  const particleCount = Math.ceil(intensity * 8);
  const speed = intensity > 0.7 ? "fast" : "normal";

  return (
    <div 
      className={`absolute inset-0 pointer-events-none overflow-hidden rounded-lg ${className}`}
      aria-hidden="true"
    >
      {/* Base energy flow lines */}
      <div className="floq-energy-flow" />
      
      {/* Directional particles */}
      <div className={`energy-particles ${speed} ${live ? 'live' : 'soon'}`}>
        {Array.from({ length: particleCount }).map((_, i) => (
          <span
            key={i}
            className="energy-particle"
            style={{
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Peak energy indicator */}
      {peakRatio > 0.8 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />
      )}
    </div>
  );
}