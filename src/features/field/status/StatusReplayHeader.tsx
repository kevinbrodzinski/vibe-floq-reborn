/**
 * Status + Replay Header
 * Clean header showing social weather status and replay controls
 */

import React, { useEffect, useMemo, useState } from 'react';
import { LiveReplayBadge } from './LiveReplayBadge';
import type { SocialWeatherPhrase } from './SocialWeatherComposer';
import './statusPulse.css';

type PhraseType = 'storm_front' | 'high_pressure' | 'low_pressure' | 'clearing';

export type StatusReplayHeaderProps = {
  phrase?: SocialWeatherPhrase | null;
  replay: {
    isReplay: boolean;
    onEnterReplay: () => void;
    onBackToLive: () => void;
    // optional — if you want to show a timestamp range
    getRangeTs?: () => [number, number];
    getFrameTs?: () => number | undefined; // current replay frame ts
  };
  // optional: compact mode (smaller paddings)
  compact?: boolean;
};

const COLORS: Record<PhraseType, string> = {
  storm_front: '#4f46e5',   // indigo-600
  high_pressure: '#f59e0b', // amber-500
  low_pressure: '#64748b',  // slate-500
  clearing: '#22c55e',      // emerald-500
};

const fgByType: Record<PhraseType, string> = {
  storm_front: 'var(--sw-color-storm)',
  high_pressure: 'var(--sw-color-high)',
  low_pressure: 'var(--sw-color-low)',
  clearing: 'var(--sw-color-clear)'
};

function IntensityMeter({ type, intensity, isReplay }: {
  type: PhraseType; 
  intensity: number; 
  isReplay: boolean;
}) {
  const style = {
    // map to CSS variables once; CSS runs the pulse
    ['--sw-bar-fg' as any]: fgByType[type],
    ['--sw-progress' as any]: Math.max(0, Math.min(1, intensity)),
  };
  return (
    <div className={`sw-meter ${isReplay ? 'sw-meter--replay' : ''}`} style={style}>
      <div className="sw-meter__fill" />
    </div>
  );
}

export function StatusReplayHeader({ phrase, replay, compact }: StatusReplayHeaderProps) {
  const p = phrase;
  const [showDetail, setShowDetail] = useState(false);
  
  // Reset detail when headline changes
  useEffect(() => { 
    setShowDetail(false); 
  }, [p?.headline]);

  if (!p) return null;

  // UI colors & background with fallback for older WebViews
  const border = COLORS[p.type];
  const bg = useMemo(() => {
    const color = COLORS[p.type];
    // Modern: color-mix, fallback: rgba for older Android WebViews
    return `color-mix(in oklab, ${color}, transparent 90%)`;
  }, [p.type]);
  const intensityPct = Math.round(p.intensity * 100);

  const tsText = useMemo(() => {
    if (!replay.isReplay || !replay.getFrameTs) return '';
    const ts = replay.getFrameTs();
    // Prefer getFrameTs() over progress math; show "Replay" if undefined
    return ts ? new Date(ts).toLocaleTimeString() : '';
  }, [replay]);

  return (
    <header
      role="region"
      aria-label="Social weather and replay controls"
      style={{
        position: 'absolute',
        top: compact ? 8 : 12,
        left: '50%', 
        transform: 'translateX(-50%)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 12,
        minWidth: compact ? 320 : 420,
        maxWidth: 720,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: compact ? '6px 10px' : '8px 12px',
        color: '#fff',
        backdropFilter: 'blur(8px)',
        zIndex: 999
      }}
    >
      {/* Status side */}
      <div style={{ display: 'grid', gap: compact ? 2 : 4 }}>
        <div
          onClick={() => p.detail && setShowDetail(v => !v)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            cursor: p.detail ? 'pointer' : 'default' 
          }}
          aria-expanded={!!(p.detail && showDetail)}
        >
          <div style={{ 
            fontWeight: 600, 
            letterSpacing: 0.2, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {p.headline}
          </div>

          {/* Intensity meter with pulse */}
          <IntensityMeter 
            type={p.type} 
            intensity={p.intensity} 
            isReplay={replay.isReplay}
          />
        </div>

        {p.detail && showDetail && (
          <div style={{ 
            fontSize: 12, 
            opacity: 0.85, 
            lineHeight: 1.3,
            maxWidth: compact ? 280 : 380,
            wordWrap: 'break-word'
          }}>
            {p.detail}
          </div>
        )}

        {/* Replay timestamp (when in replay) */}
        {replay.isReplay && tsText && (
          <div style={{ 
            fontSize: 11, 
            opacity: 0.75,
            fontFamily: 'monospace'
          }}>
            Playing: {tsText}
          </div>
        )}
      </div>

      {/* Replay control */}
      <div style={{ display: 'flex', gap: 8 }}>
        <LiveReplayBadge 
          isReplay={replay.isReplay} 
          ts={replay.getFrameTs?.()} 
          compact={compact}
        />
        <button
          onClick={replay.isReplay ? replay.onBackToLive : replay.onEnterReplay}
          aria-pressed={replay.isReplay}
          style={buttonStyle(replay.isReplay)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = replay.isReplay 
              ? 'rgba(255,255,255,0.2)' 
              : 'rgba(255,255,255,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = replay.isReplay 
              ? 'rgba(255,255,255,0.14)' 
              : 'rgba(255,255,255,0.08)';
          }}
        >
          {replay.isReplay ? 'Live' : 'Replay'}
        </button>
      </div>
    </header>
  );
}

const buttonStyle = (active: boolean): React.CSSProperties => ({
  minWidth: 88,
  padding: '6px 10px',
  background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 8,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  transition: 'all 0.2s ease-out',
  userSelect: 'none'
});