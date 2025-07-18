import { useMemo, useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useFieldTiles } from '@/hooks/useFieldTiles';
import { useFieldDiffs } from '@/hooks/useFieldDiffs';
import { useMapViewport } from '@/hooks/useMapViewport';
import { hslToString, crowdCountToRadius, geohashToCenter } from '@/lib/geo';
import { buildTileTree, hitTest, TileForTree } from '@/lib/quadtree';

// Ripple shader
const rippleFragShader = `
varying vec2 vTextureCoord;
uniform vec4 uColor;
uniform float uTime;

void main() {
  float dist = length(vTextureCoord - 0.5);
  float alpha = smoothstep(0.4, 0.0, dist + mod(uTime, 1.0) * 0.4);
  gl_FragColor = vec4(uColor.rgb, alpha * uColor.a);
}
`;

interface RippleSprite {
  sprite: PIXI.Sprite;
  startTime: number;
  duration: number;
}

export function FieldCanvas() {
  const { data: tiles = [], isLoading } = useFieldTiles();
  const { viewport } = useMapViewport();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application>();
  const mainContainerRef = useRef<PIXI.Container>();
  const rippleContainerRef = useRef<PIXI.Container>();
  const treeRef = useRef<ReturnType<typeof buildTileTree>>();
  const ripples = useRef<RippleSprite[]>([]);
  const lastCrowdCounts = useRef<Map<string, number>>(new Map());

  // Extract tile IDs for realtime subscription
  const tileIds = useMemo(() => tiles.map(t => t.tile_id), [tiles]);
  useFieldDiffs(tileIds);

  // Performance and compatibility check
  const shouldUsePIXI = useMemo(async () => {
    // Check WebGL support
    if (!PIXI.utils.isWebGLSupported()) {
      console.warn('WebGL not supported, falling back to SVG');
      return false;
    }

    // Check battery level if available
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        if (battery.level < 0.20) {
          console.warn('Low battery detected, using lightweight renderer');
          return false;
        }
      } catch (e) {
        // getBattery not available, continue
      }
    }

    return true;
  }, []);

  // Convert tiles to screen coordinates with tree building
  const screenTiles = useMemo(() => {
    if (!tiles.length) return [];

    const converted = tiles.map(tile => {
      const [latitude, longitude] = geohashToCenter(tile.tile_id);
      const x = ((longitude - viewport.center[1]) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      const y = ((viewport.center[0] - latitude) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      
      return {
        ...tile,
        x,
        y,
        radius: crowdCountToRadius(tile.crowd_count),
        color: hslToString(tile.avg_vibe),
      } as TileForTree;
    });

    // Build quadtree for hit testing
    treeRef.current = buildTileTree(converted);
    
    return converted;
  }, [tiles, viewport]);

  // Check for crowd deltas and trigger ripples
  useEffect(() => {
    screenTiles.forEach(tile => {
      const lastCount = lastCrowdCounts.current.get(tile.tile_id) || 0;
      const delta = tile.crowd_count - lastCount;
      
      if (Math.abs(delta) > 10) {
        triggerRipple(tile);
      }
      
      lastCrowdCounts.current.set(tile.tile_id, tile.crowd_count);
    });
  }, [screenTiles]);

  // One-time PIXI initialization
  useEffect(() => {
    const initPIXI = async () => {
      if (!canvasRef.current || !(await shouldUsePIXI)) return;

      const app = new PIXI.Application({
        view: canvasRef.current,
        resizeTo: window,
        antialias: true,
        backgroundAlpha: 0,
      });

      appRef.current = app;

      // Create containers
      const mainContainer = new PIXI.Container();
      const rippleContainer = new PIXI.Container();
      
      app.stage.addChild(mainContainer);
      app.stage.addChild(rippleContainer);
      
      mainContainerRef.current = mainContainer;
      rippleContainerRef.current = rippleContainer;

      // Add ticker for ripple animations
      app.ticker.add(() => {
        const now = Date.now();
        ripples.current = ripples.current.filter(ripple => {
          const elapsed = now - ripple.startTime;
          if (elapsed > ripple.duration) {
            rippleContainer.removeChild(ripple.sprite);
            return false;
          }
          
          // Update ripple shader uniform
          const progress = elapsed / ripple.duration;
          if (ripple.sprite.shader) {
            ripple.sprite.shader.uniforms.uTime = progress;
          }
          return true;
        });
      });
    };

    initPIXI();

    return () => {
      appRef.current?.destroy(true);
    };
  }, []);

  // Handle tap/click for hit testing
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!treeRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const tile = hitTest(treeRef.current, x, y, 10);
    if (tile) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Tile hit:', tile);
      }
      // TODO: openVenueOrFloqModal(tile);
    }
  }, []);

  // Add event listener for hit testing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('pointerup', handlePointerUp);
    return () => canvas.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  // Trigger ripple effect
  const triggerRipple = useCallback((tile: TileForTree) => {
    const rippleContainer = rippleContainerRef.current;
    if (!rippleContainer) return;

    try {
      // Create ripple shader
      const rippleShader = PIXI.Shader.from(`
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void) {
          gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
          vTextureCoord = aTextureCoord;
        }
      `, rippleFragShader, {
        uColor: [1.0, 1.0, 1.0, 0.8],
        uTime: 0.0,
      });

      const rippleSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
      rippleSprite.shader = rippleShader;
      rippleSprite.width = rippleSprite.height = tile.radius * 3;
      rippleSprite.anchor.set(0.5);
      rippleSprite.position.set(tile.x, tile.y);
      
      rippleContainer.addChild(rippleSprite);
      
      ripples.current.push({
        sprite: rippleSprite,
        startTime: Date.now(),
        duration: 2000, // 2 seconds
      });
    } catch (error) {
      console.warn('Failed to create ripple effect:', error);
    }
  }, []);

  // Update PIXI sprites when tiles change
  useEffect(() => {
    const mainContainer = mainContainerRef.current;
    if (!mainContainer) return;

    if (process.env.NODE_ENV === 'development') {
      console.time('PIXI:render');
    }

    // Clear existing sprites
    mainContainer.removeChildren();

    // Create new sprites
    screenTiles.forEach(tile => {
      const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
      sprite.tint = PIXI.utils.string2hex(tile.color);
      sprite.alpha = 0.6;
      sprite.width = sprite.height = tile.radius * 2;
      sprite.anchor.set(0.5);
      sprite.position.set(tile.x, tile.y);
      mainContainer.addChild(sprite);
    });

    if (process.env.NODE_ENV === 'development') {
      console.timeEnd('PIXI:render');
    }
  }, [screenTiles]);

  // Fallback to SVG if PIXI not available
  const shouldShowSVG = useMemo(async () => !(await shouldUsePIXI), []);

  if (isLoading) {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="text-sm text-muted-foreground bg-background/80 px-2 py-1 rounded animate-fade-in">
          Loading field data...
        </div>
      </div>
    );
  }

  // SVG fallback for unsupported devices
  if (shouldShowSVG) {
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
              className="animate-scale-in"
            />
          </g>
        ))}
      </svg>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-auto" 
      style={{ touchAction: 'none' }}
    />
  );
}