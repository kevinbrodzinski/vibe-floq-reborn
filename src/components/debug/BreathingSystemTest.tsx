import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { BreathingSystem } from '@/lib/field/BreathingSystem';
import type { SocialCluster } from '@/types/field';

/**
 * Debug component to test the breathing system in isolation
 */
export const BreathingSystemTest: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const breathingSystemRef = useRef<BreathingSystem | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    appRef.current = app;

    const init = async () => {
      await app.init({
        canvas: canvasRef.current!,
        width: 400,
        height: 400,
        backgroundColor: 0x1a1a1a
      });

      // Create test container
      const container = new PIXI.Container();
      app.stage.addChild(container);

      // Initialize breathing system
      breathingSystemRef.current = new BreathingSystem(container, app.renderer);

      // Create test clusters
      const testClusters: SocialCluster[] = [
        {
          id: 'test1',
          x: 150,
          y: 150,
          r: 30,
          count: 15,
          vibe: 'social',
          breathingRate: 30,
          energyLevel: 0.8,
          pulseIntensity: 0.7,
          glowRadius: 60
        },
        {
          id: 'test2', 
          x: 250,
          y: 250,
          r: 25,
          count: 10,
          vibe: 'chill',
          breathingRate: 20,
          energyLevel: 0.4,
          pulseIntensity: 0.4,
          glowRadius: 45
        }
      ];

      // Create test sprites
      const clusterSprites = new Map<string, PIXI.Sprite>();
      testClusters.forEach(cluster => {
        const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.tint = cluster.vibe === 'social' ? 0x3B82F6 : 0x10B981;
        sprite.width = cluster.r * 2;
        sprite.height = cluster.r * 2;
        sprite.anchor.set(0.5);
        sprite.position.set(cluster.x, cluster.y);
        
        container.addChild(sprite);
        clusterSprites.set(cluster.id, sprite);
      });

      // Animation loop
      app.ticker.add(() => {
        if (breathingSystemRef.current) {
          breathingSystemRef.current.updateSprites(
            testClusters,
            clusterSprites,
            app.ticker.deltaMS
          );
        }
      });
    };

    init();

    return () => {
      breathingSystemRef.current?.destroy();
      app.destroy(true);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 bg-background border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">Breathing System Test</h3>
      <canvas ref={canvasRef} className="border rounded" />
      <p className="text-xs text-muted-foreground mt-2">
        Watch clusters breathe and emit particles
      </p>
    </div>
  );
};