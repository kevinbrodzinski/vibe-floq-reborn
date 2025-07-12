
import { Zap } from 'lucide-react';
import { useFloqBoost, useUserBoostStatus, useBoostSubscription } from '@/hooks/useFloqBoosts';

interface BoostButtonProps {
  floqId: string;
  boostCount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BoostButton = ({ floqId, boostCount, className = '', size = 'md' }: BoostButtonProps) => {
  const { boost, removeBoost, isPending } = useFloqBoost();
  const { data: userBoost, isLoading } = useUserBoostStatus(floqId);
  
  // Subscribe to global boost changes
  useBoostSubscription();
  
  const userHasBoosted = !!userBoost;

  const handleClick = () => {
    console.log('🚀 BoostButton clicked:', { floqId, userHasBoosted, boostCount });
    if (userHasBoosted) {
      console.log('📉 Removing boost for floq:', floqId);
      removeBoost({ floqId });
    } else {
      console.log('📈 Adding boost for floq:', floqId);
      boost({ floqId });
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
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={userHasBoosted}
      aria-label={userHasBoosted ? `Remove boost (${boostCount} boosts)` : `Boost floq (${boostCount} boosts)`}
      className={`
        inline-flex items-center gap-1 rounded-xl font-medium transition-all duration-200
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
        ${userHasBoosted 
          ? 'bg-accent text-accent-foreground border border-accent shadow-sm scale-105' 
          : 'bg-secondary/60 text-secondary-foreground border border-border/40 hover:bg-secondary/80 hover:scale-105'
        }
        ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Zap 
        size={iconSizes[size]} 
        className={`transition-colors ${userHasBoosted ? 'fill-current' : ''} ${isPending ? 'animate-pulse' : ''}`} 
      />
      <span>{boostCount}</span>
    </button>
  );
};
