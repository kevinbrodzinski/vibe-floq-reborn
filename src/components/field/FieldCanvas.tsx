
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import RippleEffect from '@/shaders/RippleEffect';
import useRippleQueue from '@/hooks/useRippleQueue';
import { useViewportBounds } from '@/hooks/useViewportBounds';
import { useSpatialIndex, type SpatialItem } from '@/hooks/useSpatialIndex';
import { GraphicsPool } from '@/utils/objectPool';
import type { Person } from '../field/contexts/FieldSocialContext';

interface FieldCanvasProps {
  people: Person[];
  tileIds: string[];
  onRipple?: (tileId: string, delta: number) => void;
}

interface PersonSprite extends SpatialItem {
  person: Person;
  graphics: PIXI.Graphics;
  lastUpdateId: number;
}

interface RippleSprite extends SpatialItem {
  ripple: RippleEffect;
  isVisible: boolean;
}

export default function FieldCanvas({ people, tileIds, onRipple }: FieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const rippleContainer = useRef<PIXI.Container | null>(null);
  const peopleContainer = useRef<PIXI.Container | null>(null);
  const tickerRef = useRef<PIXI.Ticker | null>(null);
  const animateRef = useRef<(() => void) | null>(null);
  const isCleaningUpRef = useRef(false);
  const graphicsPoolRef = useRef<GraphicsPool>(new GraphicsPool(100, 300));
  const updateCounterRef = useRef(0);

  // Viewport bounds for culling
  const viewportBounds = useViewportBounds(canvasRef);

  // Sprite tracking
  const [personSprites, setPersonSprites] = useState<PersonSprite[]>([]);
  const [rippleSprites, setRippleSprites] = useState<RippleSprite[]>([]);

  // Spatial indexes
  const peopleSpatialIndex = useSpatialIndex(personSprites);
  const rippleSpatialIndex = useSpatialIndex(rippleSprites);

  // Handle ripple creation from queue
  const handleRipple = (tileId: string, delta: number) => {
    if (isCleaningUpRef.current || !canvasRef.current || !appRef.current || !rippleContainer.current) {
      return;
    }
    
    onRipple?.(tileId, delta);
    
    // Create ripple effect at random position for demo
    const x = Math.random() * (appRef.current.screen.width || 800);
    const y = Math.random() * (appRef.current.screen.height || 600);
    
    const ripple = new RippleEffect(x, y, 20, delta > 0 ? 0x00ff00 : 0xff0000);
    rippleContainer.current.addChild(ripple.sprite);
    
    const rippleSprite: RippleSprite = {
      id: `ripple-${Date.now()}-${Math.random()}`,
      x,
      y,
      width: 40,
      height: 40,
      ripple,
      isVisible: true,
      sprite: ripple.sprite,
    };
    
    setRippleSprites(prev => [...prev, rippleSprite]);
  };

  useRippleQueue(tileIds, handleRipple);

  // Initialize PIXI application
  useEffect(() => {
    if (!canvasRef.current) return;

    isCleaningUpRef.current = false;

    const app = new PIXI.Application({
      view: canvasRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      autoStart: true,
      backgroundAlpha: 0,
    });
    appRef.current = app;

    // Create containers
    const peopleContainerInstance = new PIXI.Container();
    const rippleContainerInstance = new PIXI.Container();
    
    app.stage.addChild(peopleContainerInstance);
    app.stage.addChild(rippleContainerInstance);
    
    peopleContainer.current = peopleContainerInstance;
    rippleContainer.current = rippleContainerInstance;

    // Animation loop with viewport culling
    const animate = () => {
      if (isCleaningUpRef.current || !canvasRef.current) return;
      
      updateCounterRef.current++;

      // Viewport culling for people
      const visiblePeople = peopleSpatialIndex.searchViewport({
        minX: viewportBounds.minX - 50, // Add buffer for smooth transitions
        minY: viewportBounds.minY - 50,
        maxX: viewportBounds.maxX + 50,
        maxY: viewportBounds.maxY + 50,
      });

      const allPeople = peopleSpatialIndex.getAllItems();
      
      // Show visible people, hide others
      allPeople.forEach(personSprite => {
        const isVisible = visiblePeople.includes(personSprite);
        personSprite.graphics.renderable = isVisible;
      });

      // Viewport culling and animation for ripples
      setRippleSprites(prev => {
        const visibleRipples = rippleSpatialIndex.searchViewport({
          minX: viewportBounds.minX - 100,
          minY: viewportBounds.minY - 100,
          maxX: viewportBounds.maxX + 100,
          maxY: viewportBounds.maxY + 100,
        });

        return prev.filter(rippleSprite => {
          const isInViewport = visibleRipples.some(r => r.id === rippleSprite.id);
          
          // Only update animation if visible
          const isActive = isInViewport ? rippleSprite.ripple.update() : true;
          rippleSprite.ripple.sprite.renderable = isInViewport;
          
          if (!isActive) {
            if (rippleContainer.current && !isCleaningUpRef.current) {
              rippleContainer.current.removeChild(rippleSprite.ripple.sprite);
            }
            rippleSprite.ripple.destroy();
          }
          
          return isActive;
        });
      });
    };

    animateRef.current = animate;
    const ticker = (app as any).ticker ?? PIXI.Ticker.shared;
    tickerRef.current = ticker;
    ticker.add(animate);
    
    // Window resize handler
    const handleResize = () => {
      if (!appRef.current || isCleaningUpRef.current || !canvasRef.current) return;
      appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCleaningUpRef.current = true;
      setPersonSprites([]);
      setRippleSprites([]);
      
      // Stop animation loop
      if (tickerRef.current && animateRef.current) {
        tickerRef.current.remove(animateRef.current);
      }

      // Clean up object pool
      graphicsPoolRef.current.releaseAll();

      // Clean up containers
      if (app?.stage) {
        app.stage.removeChildren();
      }

      window.removeEventListener('resize', handleResize);

      // Clear refs
      appRef.current = null;
      rippleContainer.current = null;
      peopleContainer.current = null;
      tickerRef.current = null;
      animateRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  // Update people sprites when people data changes
  useEffect(() => {
    if (isCleaningUpRef.current || !canvasRef.current || !appRef.current || !peopleContainer.current) {
      return;
    }

    const app = appRef.current;
    const container = peopleContainer.current;
    const pool = graphicsPoolRef.current;
    const currentUpdateId = ++updateCounterRef.current;

    // Create new sprite data
    const newPersonSprites: PersonSprite[] = people.map(person => {
      const x = (person.x / 100) * app.screen.width;
      const y = (person.y / 100) * app.screen.height;
      
      // Try to reuse existing sprite for this person
      const existingSprite = personSprites.find(ps => ps.person.id === person.id);
      let graphics: PIXI.Graphics;
      
      if (existingSprite && existingSprite.lastUpdateId < currentUpdateId) {
        graphics = existingSprite.graphics;
        existingSprite.lastUpdateId = currentUpdateId;
      } else {
        graphics = pool.acquire();
        container.addChild(graphics);
      }
      
      // Update graphics
      graphics.clear();
      graphics.beginFill(parseInt(person.color.replace('#', ''), 16));
      graphics.drawCircle(0, 0, 4);
      graphics.endFill();
      graphics.x = x;
      graphics.y = y;
      graphics.name = 'person';

      return {
        id: person.id,
        x,
        y,
        width: 8,
        height: 8,
        person,
        graphics,
        lastUpdateId: currentUpdateId,
      };
    });

    // Release unused sprites back to pool
    personSprites.forEach(oldSprite => {
      if (oldSprite.lastUpdateId < currentUpdateId) {
        container.removeChild(oldSprite.graphics);
        pool.release(oldSprite.graphics);
      }
    });

    setPersonSprites(newPersonSprites);
  }, [people, personSprites]);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
