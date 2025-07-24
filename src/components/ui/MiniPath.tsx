export const MiniPath = ({ pts = [] }: { pts: [number, number][] }) => {
  if (pts.length < 2) return null;
  // normalise to 0-56 px
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const path = pts.map(p => {
    const x = ((p[0] - minX) / (maxX - minX || 1)) * 56;
    const y = ((p[1] - minY) / (maxY - minY || 1)) * 10;
    return `${x},${10 - y}`;
  }).join(' ');
  return (
    <svg width={56} height={10} className="absolute bottom-0 left-0">
      <polyline
        points={path}
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
};