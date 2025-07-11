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
      canvas.width = canvas.offsetWidth * DPR;
      canvas.height = canvas.offsetHeight * DPR;
      ctx.scale(DPR, DPR);
      draw();
    };
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Grid (debug)
      ctx.strokeStyle = 'hsl(var(--border) / 0.06)';
      ctx.lineWidth = 1;
      const step = 64 * zoom;
      
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Center dot
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
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