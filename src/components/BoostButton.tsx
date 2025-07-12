
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useFloqBoost } from '@/hooks/useFloqBoost';
import { supabase } from '@/integrations/supabase/client';

interface BoostButtonProps {
  floqId: string;
  boostCount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BoostButton = ({ floqId, boostCount, className = '', size = 'md' }: BoostButtonProps) => {
  const [userHasBoosted, setUserHasBoosted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { boost, removeBoost, isPending } = useFloqBoost();

  // Check if current user has already boosted this floq
  useEffect(() => {
    const checkUserBoost = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user?.id) return;

        const { data, error } = await supabase
          .from('floq_boosts')
          .select('id')
          .eq('floq_id', floqId)
          .eq('user_id', user.user.id)
          .eq('boost_type', 'vibe')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!error) {
          setUserHasBoosted(!!data);
        }
      } catch (error) {
        console.error('Error checking user boost:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserBoost();
  }, [floqId]);

  // Subscribe to realtime boost changes
  useEffect(() => {
    const channel = supabase
      .channel(`floq-boosts-${floqId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_boosts',
          filter: `floq_id=eq.${floqId}`
        },
        async (payload) => {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user?.id) return;

          // Update user boost status based on realtime changes
          if (payload.eventType === 'INSERT' && payload.new?.user_id === user.user.id) {
            setUserHasBoosted(true);
          } else if (payload.eventType === 'DELETE' && payload.old?.user_id === user.user.id) {
            setUserHasBoosted(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId]);

  const handleClick = () => {
    if (userHasBoosted) {
      removeBoost({ floqId });
    } else {
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

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 rounded-xl border border-border/40 ${sizeClasses[size]} ${className}`}>
        <div className="animate-pulse w-3 h-3 bg-muted rounded-full" />
        <span className="text-muted-foreground">{boostCount}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`
        inline-flex items-center gap-1 rounded-xl font-medium transition-all duration-200
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
        className={`transition-colors ${userHasBoosted ? 'fill-current' : ''}`} 
      />
      <span>{boostCount}</span>
    </button>
  );
};
