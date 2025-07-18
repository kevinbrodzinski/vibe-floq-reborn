
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import RippleEffect from '@/shaders/RippleEffect';
import useRippleQueue from '@/hooks/useRippleQueue';
import type { Person } from '../field/contexts/FieldSocialContext';

interface FieldCanvasProps {
  people: Person[];
  tileIds: string[];
  onRipple?: (tileId: string, delta: number) => void;
}

export default function FieldCanvas({ people, tileIds, onRipple }: FieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const rippleContainer = useRef<PIXI.Container | null>(null);
  const tickerRef = useRef<PIXI.Ticker | null>(null);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  // Handle ripple creation from queue
  const handleRipple = (tileId: string, delta: number) => {
    onRipple?.(tileId, delta);
    
    // Guard against null references
    if (!rippleContainer.current || !appRef.current) return;
    
    // Create ripple effect at random position for demo
    const x = Math.random() * (appRef.current.screen.width || 800);
    const y = Math.random() * (appRef.current.screen.height || 600);
    
    const ripple = new RippleEffect(x, y, 20, delta > 0 ? 0x00ff00 : 0xff0000);
    
    // Make sure the container exists first
    if (rippleContainer.current) {
      rippleContainer.current.addChild(ripple.sprite);
      setRipples(prev => [...prev, ripple]);
    }
  };

  useRippleQueue(tileIds, handleRipple);

  // Initialize PIXI application
  useEffect(() => {
    if (!canvasRef.current) return;

    // v8 deprecation-note: use Application.init → but `new Application()` still works
    const app = new PIXI.Application({
      view: canvasRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      autoStart: true,
      backgroundAlpha: 0,
    });
    appRef.current = app;

    // create, then cache – cannot be undefined afterwards
    const rc = new PIXI.Container();
    
    app.stage.addChild(rc);
    
    rippleContainer.current = rc;

    // Animation loop
    const animate = () => {
      setRipples(prev => {
        const active = prev.filter(ripple => {
          const isActive = ripple.update();
          if (!isActive) {
            // Guard against null references
            if (rippleContainer.current) {
              rippleContainer.current.removeChild(ripple.sprite);
            }
            ripple.destroy();
          }
          return isActive;
        });
        return active;
      });
    };

    // v8: ticker is optional → fall back to PIXI.Ticker.shared
    const ticker = (app as any).ticker ?? PIXI.Ticker.shared;
    ticker.add(animate);
    
    // ----------  WINDOW RESIZE  ----------
    const handleResize = () => {
      if (!appRef.current) return;              // ← guard after unmount
      appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // 1. stop the animation loop (v8 may not have app.ticker)
      ticker.remove(animate);

      // 2. destroy stage children – clone first to avoid holes
      [...app.stage.children].forEach(child => (child as any)?.destroy?.());

      // 3. destroy the app itself
      app.destroy(true);

      // 4. detach listeners
      window.removeEventListener('resize', handleResize);

      appRef.current = null;
      rippleContainer.current = null;
    };
  }, []);

  // Render people as dots
  useEffect(() => {
    const app = appRef.current;
    if (!app?.stage || !people.length) return;

    // Safe clear existing people sprites
    app.stage.children.forEach(child => {
      if (child.name === 'person') {
        // guard - only destroy objects that expose destroy()
        (child as any)?.destroy?.();
        app.stage.removeChild(child);
      }
    });

    // Add new people sprites
    people.forEach(person => {
      const dot = new PIXI.Graphics();
      dot.beginFill(parseInt(person.color.replace('#', ''), 16));
      dot.drawCircle(0, 0, 4);
      dot.endFill();
      dot.x = (person.x / 100) * app.screen.width;
      dot.y = (person.y / 100) * app.screen.height;
      dot.name = 'person';
      app.stage.addChild(dot);
    });
  }, [people]);


  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
