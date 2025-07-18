import { useMemo, useEffect } from 'react';
import { useFieldTiles } from '@/hooks/useFieldTiles';
import { useMapViewport } from '@/hooks/useMapViewport';
import { hslToString, crowdCountToRadius } from '@/lib/geo';
import { geohashToCenter } from '@/lib/geo';

export function FieldCanvas() {
  const { data: tiles = [], isLoading } = useFieldTiles();
  const { viewport } = useMapViewport();

  // Performance monitoring
  useEffect(() => {
    console.time('FieldCanvas:render');
    return () => {
      console.timeEnd('FieldCanvas:render');
    };
  }, [tiles]);

  // Convert tiles to screen coordinates
  const screenTiles = useMemo(() => {
    if (!tiles.length) return [];

    return tiles.map(tile => {
      // Decode geohash to get center coordinates
      const [latitude, longitude] = geohashToCenter(tile.tile_id);
      
      // Convert to screen coordinates (basic projection)
      // This is a simplified projection - in production you'd use proper map projection
      const x = ((longitude - viewport.center[1]) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      const y = ((viewport.center[0] - latitude) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      
      return {
        ...tile,
        x,
        y,
        radius: crowdCountToRadius(tile.crowd_count),
        color: hslToString(tile.avg_vibe),
      };
    });
  }, [tiles, viewport]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="text-sm text-muted-foreground bg-background/80 px-2 py-1 rounded">
          Loading field data...
        </div>
      </div>
    );
  }

  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      viewBox="0 0 800 800"
      style={{ width: '100%', height: '100%' }}
    >
      {screenTiles.map((tile) => (
        <g key={tile.tile_id}>
          <circle
            cx={tile.x}
            cy={tile.y}
            r={tile.radius}
            fill={tile.color}
            fillOpacity={0.4}
            stroke={tile.color}
            strokeWidth={2}
            strokeOpacity={0.6}
          />
          {/* Optional: Show crowd count for debugging */}
          {tile.crowd_count > 0 && (
            <text
              x={tile.x}
              y={tile.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fill="currentColor"
              className="text-xs font-mono"
            >
              {tile.crowd_count}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}