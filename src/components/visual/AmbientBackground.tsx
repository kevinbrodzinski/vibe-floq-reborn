import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo } from 'react';

interface Props {
  /** hex / hsl / css color representing current moment */
  color: string;
}

/**
 * Smoothly tween the page's background toward the active moment's color.
 * – Renders a full-screen `<motion.div>` behind everything else.
 */
export default function AmbientBackground({ color }: Props) {
  // convert hex → HSL fallback (naïve)
  const hslColor = useMemo(() => {
    const el = document.createElement('div');
    el.style.color = color;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;          // rgb(r, g, b)
    document.body.removeChild(el);
    const [r, g, b] = computed
      .match(/\d+/g)!
      .map(Number)
      .map((v) => v / 255);

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = 60 * (((g - b) / d) % 6); break;
        case g: h = 60 * ((b - r) / d + 2);   break;
        case b: h = 60 * ((r - g) / d + 4);   break;
      }
    }
    return `hsl(${h.toFixed(0)}deg ${ (s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
  }, [color]);

  // spring the opacity (visible only when color ≠ transparent)
  const progress = useSpring(0, { stiffness: 120, damping: 20 });
  const bg = useTransform(progress, [0, 1], ['transparent', hslColor]);

  useEffect(() => {
    progress.set(1);                // animate in
    return () => progress.set(0);   // animate out on unmount
  }, [hslColor, progress]);

  return (
    <motion.div
      style={{ background: bg }}
      className="fixed inset-0 -z-20 transition-colors duration-700"
      aria-hidden="true"
    />
  );
}