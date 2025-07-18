
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

    const initApp = async () => {
      if (!appRef.current) {
        /* PIXI v6/7 */
        if (typeof (PIXI.Application as any).init !== 'function') {
          appRef.current = new PIXI.Application({
            view: canvasRef.current!,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
          });
        } else {
          /* PIXI v8 */
          appRef.current = await (PIXI.Application as any).init({
            view: canvasRef.current!,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
          });
        }
      }

      const app = appRef.current;

      // Create ripple container
      if (!rippleContainer.current) {
        rippleContainer.current = new PIXI.Container();
        app.stage.addChild(rippleContainer.current);
      }

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

      app.ticker.add(animate);
    };

    initApp();

    // Cleanup with defensive guards
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
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
        // child.destroy exists only on Sprite / Graphics etc.
        if ('destroy' in child && typeof (child as any).destroy === 'function') {
          (child as any).destroy(true);
        }
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (appRef.current) {
        appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
