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
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop (only if shouldAnimate is true)
    if (shouldAnimate) {
      const animate = (time: number) => {
        generateCanvasGradient(canvas, colors, time, true);
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
      {/* Fallback gradient for when canvas fails */}
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