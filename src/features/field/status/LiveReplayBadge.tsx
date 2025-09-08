/**
 * Live/Replay State Badge
 * Shows current mode with timestamp during replay
 */

import React from 'react';

export function LiveReplayBadge({
  isReplay,
  ts,              // optional timestamp (ms) to show during replay
  compact = false,
}: { isReplay: boolean; ts?: number; compact?: boolean }) {

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: 6,
    borderRadius: 999, 
    padding: compact ? '2px 8px' : '4px 10px',
    fontSize: compact ? 11 : 12, 
    fontWeight: 700, 
    letterSpacing: 0.2,
    border: '1px solid rgba(255,255,255,0.25)', 
    color: '#fff', 
    userSelect: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  if (!isReplay) {
    return (
      <span title="Live mode" style={{ 
        ...chipStyle, 
        background: 'rgba(34,197,94,0.18)' /* emerald-500 */ 
      }}>
        <span style={{
          width: 8, 
          height: 8, 
          borderRadius: 8, 
          background: '#22c55e', 
          boxShadow: '0 0 8px #22c55e',
          animation: 'pulse 2s infinite'
        }} />
        LIVE
      </span>
    );
  }
  
  return (
    <span title="Replay mode" style={{ 
      ...chipStyle, 
      background: 'rgba(148,163,184,0.20)' /* slate-400 */ 
    }}>
      REPLAY {ts ? (
        <span style={{ 
          opacity: 0.8, 
          fontVariantNumeric: 'tabular-nums',
          fontSize: compact ? 10 : 11
        }}>
          {new Date(ts).toLocaleTimeString()}
        </span>
      ) : null}
    </span>
  );
}