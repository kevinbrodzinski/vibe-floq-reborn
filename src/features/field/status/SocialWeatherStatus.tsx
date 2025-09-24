import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { SocialWeatherPhrase } from './SocialWeatherComposer';

const COLORS: Record<SocialWeatherPhrase['type'], string> = {
  storm_front: '#4f46e5', // indigo-600
  high_pressure: '#f59e0b', // amber-500
  low_pressure: '#64748b',  // slate-500
  clearing: '#22c55e'      // emerald-500
};

export function SocialWeatherStatus({ phrase }: { phrase?: SocialWeatherPhrase | null }) {
  const [showDetail, setShowDetail] = useState(false);
  const p = phrase;
  if (!p) return null;

  const bg = useMemo(() => `${COLORS[p.type]}1A`, [p.type]); // ~10% alpha
  const border = useMemo(() => COLORS[p.type], [p.type]);

  return (
    <div
      onClick={() => p.detail && setShowDetail(v => !v)}
      style={{
        position: 'absolute', 
        top: 12, 
        left: '50%', 
        transform: 'translateX(-50%)',
        background: bg, 
        border: `1px solid ${border}`, 
        borderRadius: 12,
        padding: '8px 12px', 
        color: '#fff', 
        backdropFilter: 'blur(8px)', 
        cursor: p.detail ? 'pointer' : 'default',
        userSelect: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10, 
        zIndex: 999
      }}
    >
      <motion.div
        animate={p.intensity > 0.75 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: p.intensity > 0.75 ? Infinity : 0 }}
        style={{ fontSize: 18 }}
      >
        {p.emoji}
      </motion.div>
      <div style={{ fontWeight: 600 }}>{p.headline}</div>
      {p.intensity > 0.6 && (
        <div style={{
          marginLeft: 8, 
          padding: '2px 6px', 
          borderRadius: 8, 
          background: '#ffffff22', 
          fontSize: 12
        }}>
          {(p.intensity * 100 | 0)}%
        </div>
      )}
      {showDetail && p.detail && (
        <div style={{
          marginLeft: 12, 
          fontSize: 12, 
          opacity: 0.85, 
          borderLeft: `1px solid ${border}`, 
          paddingLeft: 12
        }}>
          {p.detail}
        </div>
      )}
    </div>
  );
}