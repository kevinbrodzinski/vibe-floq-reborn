import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VIBES, VIBE_RGB } from '@/lib/vibes';
import { vibeToHex, vibeToPixi, mixHexOklab } from '@/lib/vibe/color';
import type { Vibe } from '@/lib/vibes';

/**
 * Development component to visually verify vibe color consistency
 * across hex, RGB, PIXI, and OKLab mixing
 */
export function VibesPreview() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Vibe Color System Preview</h2>
        <Badge variant="outline">{VIBES.length} vibes</Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {VIBES.map((vibe) => {
          const rgb = VIBE_RGB[vibe];
          const hex = vibeToHex(vibe);
          const pixi = vibeToPixi(vibe);
          const mixed = mixHexOklab(hex, '#EC4899', 0.5); // Mix with pink
          
          return (
            <Card key={vibe} className="p-3">
              <div className="space-y-2">
                {/* Color swatch */}
                <div 
                  className="w-full h-16 rounded-lg border shadow-sm"
                  style={{ backgroundColor: hex }}
                />
                
                {/* Vibe name */}
                <div className="text-sm font-medium capitalize">{vibe}</div>
                
                {/* Color values */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>RGB: {rgb.join(', ')}</div>
                  <div>Hex: {hex}</div>
                  <div>PIXI: 0x{pixi.toString(16).toUpperCase()}</div>
                </div>
                
                {/* Mixed color preview */}
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: mixed }}
                  />
                  <span className="text-xs text-muted-foreground">Mixed</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Gradient test */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Gradient Test (OKLab Mixing)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VIBES.slice(0, 6).map((vibe) => {
            const startHex = vibeToHex(vibe);
            const endHex = vibeToHex(VIBES[(VIBES.indexOf(vibe) + 3) % VIBES.length] as Vibe);
            
            return (
              <div key={vibe} className="space-y-2">
                <div className="text-xs font-medium capitalize">{vibe} → mixed</div>
                <div 
                  className="h-8 rounded border"
                  style={{
                    background: `linear-gradient(to right, ${startHex}, ${mixHexOklab(startHex, endHex, 0.5)}, ${endHex})`
                  }}
                />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}