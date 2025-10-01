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
      className="fixed left-1/2 -translate-x-1/2 top-[calc(72px+env(safe-area-inset-top))] z-[560] 
                 flex items-center gap-2.5 px-3 py-2 rounded-xl backdrop-blur-md
                 text-white select-none"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        cursor: p.detail ? 'pointer' : 'default',
      }}
    >
      <motion.div
        animate={p.intensity > 0.75 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: p.intensity > 0.75 ? Infinity : 0 }}
        className="text-lg"
      >
        {p.emoji}
      </motion.div>
      <div className="font-semibold">{p.headline}</div>
      {p.intensity > 0.6 && (
        <div className="ml-2 px-1.5 py-0.5 rounded-lg bg-white/15 text-xs">
          {(p.intensity * 100 | 0)}%
        </div>
      )}
      {showDetail && p.detail && (
        <div 
          className="ml-3 pl-3 text-xs opacity-85 border-l"
          style={{ borderColor: border }}
        >
          {p.detail}
        </div>
      )}
    </div>
  );
}