import { memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const DPR = window.devicePixelRatio || 1;
    
    const resize = () => {
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
      
      // Hide grid at high zoom when it becomes too dense
      if (zoom < 3) {
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
      
      // Center dot
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.arc((width / DPR) / 2, (height / DPR) / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    };
    
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [zoom]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full flex-1 touch-none', className)}
    />
  );
});

FieldGalaxy.displayName = 'FieldGalaxy';