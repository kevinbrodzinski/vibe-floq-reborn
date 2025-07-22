import { motion } from 'framer-motion';
import React from 'react';

interface Props {
  x: number;
  y: number;
  count: number;
  vibe: string;
}

export const ClusterTooltip: React.FC<Props> = ({ x, y, count, vibe }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    className="pointer-events-none absolute z-50 select-none 
               rounded-xl bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-md"
    style={{ top: y, left: x }}
  >
    <span className="font-semibold">{count}</span> people<br />
    vibe: <span className="capitalize">{vibe}</span>
  </motion.div>
);