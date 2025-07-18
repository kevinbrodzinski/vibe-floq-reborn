
import { Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useFloqBoost, useUserBoostStatus, useBoostSubscription } from '@/hooks/useFloqBoosts';
import { useToast } from '@/hooks/use-toast';

interface BoostButtonProps {
  floqId: string;
  boostCount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BoostButton = ({ floqId, boostCount, className = '', size = 'md' }: BoostButtonProps) => {
  const { mutateAsync: boost, isPending } = useFloqBoost();
  const { data: userBoost, isLoading } = useUserBoostStatus(floqId);
  const { toast } = useToast();
  
  // Subscribe to global boost changes
  useBoostSubscription('');
  
  const userHasBoosted = !!userBoost;
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; delay: number }>>([]);
  const [countAnimation, setCountAnimation] = useState(boostCount);

  // Reset count animation when floqId changes (prevents flicker)
  useEffect(() => {
    setCountAnimation(boostCount);
  }, [floqId, boostCount]);

  // Create particle burst effect
  const createParticleBurst = () => {
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      delay: i * 0.1
    }));
    setParticles(newParticles);
    
    // Clear particles after animation
    setTimeout(() => setParticles([]), 1000);
  };

  const handleClick = async () => {
    console.log('🚀 BoostButton clicked (fire-and-forget):', { floqId, userHasBoosted, boostCount });
    
    // Fire-and-forget: if already boosted, show message instead of removing
    if (userHasBoosted) {
      console.log('👍 Already boosted - showing info message');
      toast({
        title: "Already boosted!",
        description: "You've already boosted this floq. Boosts are fire-and-forget.",
        variant: "default",
      });
      return;
    }
    
    setIsAnimating(true);
    
    try {
      console.log('📈 Adding boost for floq:', floqId);
      await boost({ floqId });
      createParticleBurst();
      // Toast is handled by the hook now
    } catch (error) {
      console.error('Boost action failed:', error);
      // Error toast is handled by the hook
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-1 rounded-xl border border-border/40 ${sizeClasses[size]} ${className}`}>
        <Zap size={iconSizes[size]} className="animate-pulse text-muted-foreground" />
        <span className="text-muted-foreground">{boostCount}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={handleClick}
        disabled={isPending || isLoading}
        aria-pressed={userHasBoosted}
        aria-label={userHasBoosted ? `Already boosted this floq (${boostCount} total boosts)` : `Boost this floq (${boostCount} current boosts)`}
        className={`
          relative overflow-hidden inline-flex items-center gap-1 rounded-xl font-medium
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
          ${userHasBoosted 
            ? 'bg-accent text-accent-foreground border border-accent glow-active' 
            : 'bg-secondary/60 text-secondary-foreground border border-border/40 hover:bg-secondary/80'
          }
          ${isPending || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${sizeClasses[size]}
          ${className}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: userHasBoosted 
            ? ['0 0 0px hsl(var(--accent))', '0 0 20px hsl(var(--accent) / 0.5)', '0 0 0px hsl(var(--accent))']
            : 'none'
        }}
        transition={{
          boxShadow: { duration: 2, repeat: userHasBoosted ? Infinity : 0, ease: "easeInOut" },
          scale: { duration: 0.1 }
        }}
      >
        {/* Background pulse effect for boosted state */}
        <AnimatePresence>
          {userHasBoosted && (
            <motion.div
              className="absolute inset-0 bg-accent/20 rounded-xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: [0, 0.5, 0] }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Icon with animations */}
        <motion.div
          animate={isAnimating ? { rotate: [0, 15, -15, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          {userHasBoosted ? (
            <Sparkles 
              size={iconSizes[size]} 
              className="fill-current text-accent-foreground" 
            />
          ) : (
            <Zap 
              size={iconSizes[size]} 
              className={`transition-colors ${isPending ? 'animate-pulse' : ''}`} 
            />
          )}
        </motion.div>

        {/* Animated count */}
        <motion.span
          key={countAnimation}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {countAnimation}
        </motion.span>
      </motion.button>

      {/* Particle burst effect */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-accent rounded-full pointer-events-none"
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{
              scale: [0, 1, 0],
              x: (Math.random() - 0.5) * 60,
              y: (Math.random() - 0.5) * 60,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              delay: particle.delay,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
