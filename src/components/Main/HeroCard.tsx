import { motion } from 'framer-motion';
import { ParticleField } from '@/components/effects/ParticleField/ParticleField.web';

interface HeroCardProps {
  title: string;
  vibe?: string;
  onPress?: () => void;
  isActive?: boolean;
  showParticles?: boolean;
}

export const HeroCard = ({ 
  title, 
  vibe = "chill", 
  onPress, 
  isActive = false,
  showParticles = false 
}: HeroCardProps) => {
  // Map vibe to particle hue
  const getVibeHue = (vibe: string) => {
    const vibeHues: Record<string, number> = {
      chill: 280,     // Purple
      energetic: 120, // Green
      focused: 200,   // Blue
      creative: 60,   // Yellow
      social: 300,    // Magenta
      default: 280,
    };
    return vibeHues[vibe] || vibeHues.default;
  };

  return (
    <motion.div
      className="h-96 cursor-pointer select-none"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative h-full bg-card border border-border rounded-lg overflow-hidden">
        {showParticles && (
          <ParticleField 
            count={14} 
            hue={getVibeHue(vibe)}
            className="z-0"
          />
        )}
        
        <div className="relative z-10 h-full flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                <div 
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: `hsl(${getVibeHue(vibe)}, 70%, 60%)` }}
                />
                {vibe}
              </div>
            </div>
          </div>
          
          <div className="flex items-end justify-between">
            <div className="text-sm text-muted-foreground">
              Tap to explore
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};