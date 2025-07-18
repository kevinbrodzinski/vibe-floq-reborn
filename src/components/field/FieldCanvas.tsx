
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const rippleContainer = useRef<PIXI.Container | null>(null);
  const tickerRef = useRef<PIXI.Ticker | null>(null);
  const animateRef = useRef<(() => void) | null>(null);
  const isCleaningUpRef = useRef(false);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  // Handle ripple creation from queue
  const handleRipple = (tileId: string, delta: number) => {
    // Guard against operations during cleanup
    if (isCleaningUpRef.current || !canvasRef.current) return;
    
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
      if (isCleaningUpRef.current || !canvasRef.current) return;
      
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
      if (!appRef.current || isCleaningUpRef.current || !canvasRef.current) return;
      appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // Set cleanup flag immediately
      isCleaningUpRef.current = true;
      
      // Clear ripples state to prevent stale animations
      setRipples([]);
      
      // 1. Stop the animation loop using stored refs
      if (tickerRef.current && animateRef.current) {
        tickerRef.current.remove(animateRef.current);
      }

      // 2. Clean up our custom objects only
      if (app?.stage) {
        // Clean up people dots
        for (const obj of [...app.stage.children]) {
          if (!obj || (obj as any)._destroyed) continue;
          if (obj.name === 'person') {
            (obj as any)._destroyed = true;
            (obj as any).destroy?.();
            app.stage.removeChild(obj);
          }
        }
        
        // Clean up ripple containers
        app.stage.removeChildren();
      }

      // 3. Remove event listeners
      window.removeEventListener('resize', handleResize);

      // 4. Clear refs - let PIXI handle its own destruction when canvas is removed from DOM
      appRef.current = null;
      rippleContainer.current = null;
      tickerRef.current = null;
      animateRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  // Render people as dots
  useEffect(() => {
    // Guard against operations during cleanup
    if (isCleaningUpRef.current || !canvasRef.current) return;
    
    const app = appRef.current;
    if (!app?.stage || !people.length) return;

    // Remove existing people sprites with defensive loop
    for (const obj of [...app.stage.children]) {
      // guard: skip falsy or already-destroyed references
      if (!obj || (obj as any)._destroyed) continue;
      if (obj.name === 'person') {
        // Mark as destroyed before calling destroy to prevent double-destroy
        (obj as any)._destroyed = true;
        (obj as any).destroy?.();          
        app.stage.removeChild(obj);
      }
    }

    // Add new people sprites
    people.forEach(person => {
      // Guard against operations during cleanup
      if (isCleaningUpRef.current || !canvasRef.current) return;
      
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
