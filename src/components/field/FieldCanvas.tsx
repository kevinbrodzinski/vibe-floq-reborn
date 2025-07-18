
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
  const animateRef = useRef<(() => void) | null>(null);
  const isCleaningUpRef = useRef(false);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  // Handle ripple creation from queue
  const handleRipple = (tileId: string, delta: number) => {
    // Guard against operations during cleanup
    if (isCleaningUpRef.current) return;
    
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

    // Reset cleanup flag
    isCleaningUpRef.current = false;

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

    // Animation loop with proper ref storage
    const animate = () => {
      // Guard against operations during cleanup
      if (isCleaningUpRef.current) return;
      
      setRipples(prev => {
        const active = prev.filter(ripple => {
          const isActive = ripple.update();
          if (!isActive) {
            // Guard against null references and cleanup state
            if (rippleContainer.current && !isCleaningUpRef.current) {
              rippleContainer.current.removeChild(ripple.sprite);
            }
            ripple.destroy();
          }
          return isActive;
        });
        return active;
      });
    };

    // Store animate function in ref for cleanup
    animateRef.current = animate;

    // v8: ticker is optional → fall back to PIXI.Ticker.shared
    const ticker = (app as any).ticker ?? PIXI.Ticker.shared;
    tickerRef.current = ticker;
    ticker.add(animate);
    
    // ----------  WINDOW RESIZE  ----------
    const handleResize = () => {
      if (!appRef.current || isCleaningUpRef.current) return;              // ← guard after unmount
      appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // Set cleanup flag immediately
      isCleaningUpRef.current = true;
      
      // Clear ripples state to prevent stale animations
      setRipples([]);
      
      // 0️⃣ remove PIXI's global resize hook **before** the canvas disappears
      (window as any).removeEventListener?.('resize', (app as any)._resize);
      
      // 1. stop the animation loop using stored refs
      if (tickerRef.current && animateRef.current) {
        tickerRef.current.remove(animateRef.current);
      }

      // 2. just empty the display-list using PIXI's built-in helper
      //    This leaves PIXI with an intact (but length-0) children array,
      //    so its own `Application.destroy()` loop never sees `undefined`.
      app?.stage.removeChildren();      // one-liner, does the null checks for us

      // 3. destroy the app itself (idempotent guard)
      if (!(app as any)._destroyed) {
        (app as any)._destroyed = true;   // mark so we don't run twice
        app.destroy(true);
      }

      // 4. detach listeners
      window.removeEventListener('resize', handleResize);

      appRef.current = null;
      rippleContainer.current = null;
      tickerRef.current = null;
      animateRef.current = null;
    };
  }, []);

  // Render people as dots
  useEffect(() => {
    // Guard against operations during cleanup
    if (isCleaningUpRef.current) return;
    
    const app = appRef.current;
    if (!app?.stage || !people.length) return;

    // Remove existing people sprites with defensive loop
    for (const obj of [...app.stage.children]) {
      // guard: skip falsy or already-destroyed references
      if (!obj || (obj as any)._destroyed) continue;
      if (obj.name === 'person') {
        (obj as any).destroy?.();          // optional-chaining is *not* enough if obj === undefined
        app.stage.removeChild(obj);
      }
    }

    // Add new people sprites
    people.forEach(person => {
      // Guard against operations during cleanup
      if (isCleaningUpRef.current) return;
      
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
