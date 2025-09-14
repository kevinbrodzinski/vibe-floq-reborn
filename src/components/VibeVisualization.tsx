import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { vibeEmoji } from "@/utils/vibe";
import { vibeToHex } from "@/lib/vibe/color";
import { safeVibe } from '@/lib/vibes';

interface VibeVisualizationProps {
  vibeData: Array<{
    vibe: string;
    count: number;
    percentage: number;
  }>;
  dominantVibe: string;
  energyLevel: number;
  className?: string;
}

export function VibeVisualization({ 
  vibeData, 
  dominantVibe, 
  energyLevel, 
  className = "" 
}: VibeVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const { width, height } = canvas;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Create energy ripple effect
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2 - 20;

      // Background gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      gradient.addColorStop(0, `hsl(var(--primary) / 0.1)`);
      gradient.addColorStop(1, `hsl(var(--background) / 0.5)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw energy ripples
      const time = Date.now() * 0.001;
      const rippleCount = 3;
      
      for (let i = 0; i < rippleCount; i++) {
        const ripplePhase = (time + i * 0.5) % 2;
        const rippleRadius = (ripplePhase / 2) * maxRadius * (energyLevel / 100);
        const opacity = Math.max(0, 1 - ripplePhase);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsl(var(--primary) / ${opacity * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw vibe segments
      let currentAngle = -Math.PI / 2;
      const innerRadius = 30;
      const outerRadius = maxRadius * 0.7;

      vibeData.forEach((vibe, index) => {
        if (vibe.percentage === 0) return;
        
        const segmentAngle = (vibe.percentage / 100) * Math.PI * 2;
        
        // Create vibe color gradient
        const vibeGradient = ctx.createRadialGradient(
          centerX, centerY, innerRadius,
          centerX, centerY, outerRadius
        );
        const baseColor = vibeToHex(safeVibe(vibe.vibe));
        vibeGradient.addColorStop(0, baseColor + 'CC'); // 80% opacity
        vibeGradient.addColorStop(1, baseColor + '33'); // 20% opacity
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + segmentAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + segmentAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = vibeGradient;
        ctx.fill();
        
        // Add border
        ctx.strokeStyle = vibeToHex(safeVibe(vibe.vibe)) + 'CC'; // 80% opacity
        ctx.lineWidth = 1;
        ctx.stroke();
        
        currentAngle += segmentAngle;
      });

      // Draw center circle with dominant vibe
      const centerGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, innerRadius
      );
      const dominantColor = vibeToHex(safeVibe(dominantVibe));
      centerGradient.addColorStop(0, dominantColor + 'CC'); // 80% opacity
      centerGradient.addColorStop(1, dominantColor + '66'); // 40% opacity
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = centerGradient;
      ctx.fill();
      ctx.strokeStyle = vibeToHex(safeVibe(dominantVibe));
      ctx.lineWidth = 2;
      ctx.stroke();

      // Schedule next frame
      animationId = requestAnimationFrame(render);
    };

    render();

    // Cleanup animation on unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [vibeData, dominantVibe, energyLevel]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="w-full h-full"
      />
      
      {/* Center emoji overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-4xl"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {vibeEmoji(dominantVibe)}
        </motion.span>
      </div>
      
      {/* Vibe legend */}
      <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
        <div className="flex flex-wrap gap-2 justify-center max-w-full">
          {vibeData.filter(v => v.percentage > 5).map((vibe) => (
            <motion.div
              key={vibe.vibe}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-card/80 backdrop-blur border border-border/50"
            >
              <span className="text-xs">{vibeEmoji(vibe.vibe)}</span>
              <span className="text-xs font-medium">{vibe.percentage}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}