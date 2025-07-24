export const MiniPath = ({ pts = [] }: { pts: [number, number][] }) => {
  if (pts.length < 2) return null;
  // normalise to 0-56 px - swap lat/lng for correct x,y mapping
  const xs = pts.map(p => p[1]); // lng
  const ys = pts.map(p => p[0]); // lat
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const path = pts.map(p => {
    const x = ((p[1] - minX) / (maxX - minX || 1)) * 56; // lng
    const y = ((p[0] - minY) / (maxY - minY || 1)) * 10; // lat
    return `${x},${10 - y}`;
  }).join(' ');
  return (
    <svg width={56} height={10} viewBox="0 0 56 10" className="absolute bottom-0 left-0 z-0">
      <polyline
        points={path}
        stroke="currentColor"
        strokeWidth={1}
        fill="none"
        opacity={0.6}
      />
    </svg>
  );
};