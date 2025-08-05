import React from 'react';
import { FieldTile } from '@/types/field';
import { cn } from '@/lib/utils';

interface TileDebugVisualProps {
  fieldTiles: FieldTile[];
  visible: boolean;
  className?: string;
}

/**
 * Debug visualization for field tile boundaries and cluster data
 * Shows tile boundaries, crowd counts, and vibe averages
 */
export const TileDebugVisual: React.FC<TileDebugVisualProps> = ({
  fieldTiles,
  visible,
  className
}) => {
  if (!visible || fieldTiles.length === 0) return null;

  return (
    <div className={cn(
      "absolute inset-0 pointer-events-none z-[200]",
      "font-mono text-xs",
      className
    )}>
      {fieldTiles.map((tile, index) => (
        <div
          key={tile.tile_id}
          className="absolute border border-green-400/50 bg-green-400/10"
          style={{
            left: `${10 + (index % 4) * 200}px`,
            top: `${10 + Math.floor(index / 4) * 120}px`,
            width: '180px',
            height: '100px',
            borderRadius: '8px'
          }}
        >
          {/* Tile header */}
          <div className="bg-green-600/80 text-white px-2 py-1 text-[10px] font-bold">
            Tile: {tile.tile_id}
          </div>
          
          {/* Tile data */}
          <div className="p-2 space-y-1">
            <div className="text-green-200">
              <span className="text-green-100">Count:</span> {tile.crowd_count}
            </div>
            
            <div className="text-green-200">
              <span className="text-green-100">Vibe:</span>
              <div 
                className="w-3 h-3 inline-block ml-1 rounded-full border border-white/30"
                style={{
                  backgroundColor: `hsl(${tile.avg_vibe?.h || 0}, ${tile.avg_vibe?.s || 0}%, ${tile.avg_vibe?.l || 50}%)`
                }}
              />
            </div>
            
            <div className="text-green-200 text-[9px]">
              Floqs: {tile.active_floq_ids?.length || 0}
            </div>
            
            <div className="text-green-200 text-[9px]">
              Updated: {new Date(tile.updated_at).toLocaleTimeString()}
            </div>
          </div>
          
          {/* Cluster indicator */}
          {tile.crowd_count >= 3 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
              !
            </div>
          )}
        </div>
      ))}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 p-3 rounded-lg text-green-200 max-w-xs">
        <div className="text-green-100 font-bold mb-2">Debug Legend</div>
        <div className="space-y-1 text-[10px]">
          <div>🟢 Green boxes = Field tiles</div>
          <div>🔴 Red dot = Active cluster (3+ people)</div>
          <div>🎨 Color circle = Average vibe</div>
          <div>📊 Count = People in tile</div>
        </div>
      </div>
    </div>
  );
};