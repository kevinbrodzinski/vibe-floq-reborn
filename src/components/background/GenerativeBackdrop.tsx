import React, { useEffect, useRef, useState } from 'react';
import { getVibeColorPalette, generateCanvasGradient } from '@/lib/vibeColors';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface GenerativeBackdropProps {
  dominantVibe?: string;
  baseColor?: string;
  className?: string;
  animate?: boolean;
}

export const GenerativeBackdrop: React.FC<GenerativeBackdropProps> = ({
  dominantVibe = 'chill',
  baseColor,
  className = '',
  animate = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [fallbackGradient, setFallbackGradient] = useState<string>('');
  const prefersReduced = usePrefersReducedMotion();
  
  // Disable animation if user prefers reduced motion
  const shouldAnimate = animate && !prefersReduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = getVibeColorPalette(dominantVibe, baseColor);
    
    // Set fallback CSS gradient
    setFallbackGradient(
      `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`
    );

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with proper scaling
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Reset transform matrix to avoid accumulation on resize
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop with noise throttling for performance
    if (shouldAnimate) {
      let lastNoiseTime = 0;
      const animate = (time: number) => {
        // Throttle noise generation to improve performance on mobile
        const shouldAddNoise = time - lastNoiseTime > 1000; // Every 1 second
        generateCanvasGradient(canvas, colors, time, shouldAddNoise);
        if (shouldAddNoise) lastNoiseTime = time;
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Static gradient for reduced motion
      generateCanvasGradient(canvas, colors, 0, false);
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dominantVibe, baseColor, shouldAnimate]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 opacity-20 ${className}`}
        style={{ width: '100%', height: '100%' }}
      />
      {/* Fallback gradient for when canvas fails - now applied */}
      <div
        className={`absolute inset-0 opacity-20 ${className}`}
        style={{
          background: fallbackGradient,
          display: canvasRef.current?.getContext('2d') ? 'none' : 'block',
        }}
      />
    </>
  );
};