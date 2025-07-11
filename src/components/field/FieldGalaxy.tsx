import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useGalaxyNodes } from '@/hooks/useGalaxyNodes';
import { vibeColor } from '@/utils/getVibeColor';
import { useDebug } from '@/lib/useDebug';

interface Props {
  zoom: number; // 0.5 → 4.0
  className?: string;
}

/**
 * Canvas-based star-field showing users / venues as glowing nodes.
 * This first slice just draws a faint grid + center dot so we have layout.
 */
export const FieldGalaxy = memo(({ zoom, className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debug] = useDebug();
  
  // Track canvas dimensions for node positioning
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const nodes = useGalaxyNodes(dims.w, dims.h);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const DPR = window.devicePixelRatio || 1;
    
    const resize = () => {
      // Update dimensions for node positioning
      setDims({ w: canvas.offsetWidth, h: canvas.offsetHeight });
      
      // Fix canvas scaling - clear transforms before applying new DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.width = canvas.offsetWidth * DPR;
      canvas.height = canvas.offsetHeight * DPR;
      ctx.scale(DPR, DPR);
      draw();
    };
    
    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width / DPR, height / DPR);
      
      // Debug grid (only show in development)
      if (debug && zoom < 3) {
        ctx.strokeStyle = 'hsl(var(--border) / 0.06)';
        ctx.lineWidth = 1;
        const step = 64 * zoom;
        
        // Optimize grid rendering - only draw visible lines
        const canvasWidth = width / DPR;
        const canvasHeight = height / DPR;
        
        for (let x = 0; x < canvasWidth; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
          ctx.stroke();
        }
        
        for (let y = 0; y < canvasHeight; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth, y);
          ctx.stroke();
        }
      }
      
      // === GALAXY NODES ===
      nodes.forEach(node => {
        // Improved glow radius scaling - caps at 2x zoom to prevent oversized glows
        const baseSize = node.kind === 'venue' ? 20 : node.kind === 'floq' ? 16 : 12;
        const rOuter = (baseSize + 8 * node.weight) * Math.min(zoom, 2);
        
        // Different core sizes for visual hierarchy
        const rInner = node.kind === 'venue' ? 5 : node.kind === 'floq' ? 4 : 3;
        
        // Outer glow with gradient for smoother falloff
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, rOuter);
        gradient.addColorStop(0, vibeColor(node.vibe, 0.4));
        gradient.addColorStop(0.5, vibeColor(node.vibe, 0.15));
        gradient.addColorStop(1, vibeColor(node.vibe, 0));
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(node.x, node.y, rOuter, 0, Math.PI * 2);
        ctx.fill();
        
        // Core dot
        ctx.beginPath();
        ctx.fillStyle = vibeColor(node.vibe, node.isSelf ? 1 : 0.8);
        ctx.arc(node.x, node.y, rInner, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    
    // Node interaction handling
    const hit = (x: number, y: number) => {
      return nodes.find(n => Math.hypot(n.x - x, n.y - y) < 32 * zoom * n.weight);
    };
    
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const node = hit(e.clientX - rect.left, e.clientY - rect.top);
      if (node) {
        console.log('Node tapped:', node);
        // TODO: Open modal or sheet for node details
      }
    };
    
    canvas.addEventListener('pointerdown', onPointer);
    resize();
    window.addEventListener('resize', resize);
    
    return () => {
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', resize);
    };
  }, [zoom, nodes]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full flex-1 touch-none', className)}
    />
  );
});

FieldGalaxy.displayName = 'FieldGalaxy';