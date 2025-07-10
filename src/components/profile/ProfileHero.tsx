import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/providers/AuthProvider';
import { getVibeColor } from '@/utils/getVibeColor';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfileHeroProps {
  userId?: string;
}

export function ProfileHero({ userId }: ProfileHeroProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const { data: profile } = useProfile(targetUserId);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Get current vibe and availability
  const { data: currentVibe } = useQuery({
    queryKey: ['current-vibe', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data } = await supabase
        .from('vibes_now')
        .select('vibe, expires_at')
        .eq('user_id', targetUserId)
        .single();
      
      return data;
    },
    enabled: !!targetUserId,
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Get user settings for availability
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data } = await supabase
        .from('user_settings')
        .select('available_until')
        .eq('user_id', targetUserId)
        .single();
      
      return data;
    },
    enabled: !!targetUserId,
  });

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const availableUntil = userSettings?.available_until || currentVibe?.expires_at;
      if (!availableUntil) {
        setTimeLeft('');
        return;
      }

      const now = new Date();
      const expiry = new Date(availableUntil);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        setTimeLeft(`${hours}h ${minutes % 60}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userSettings?.available_until, currentVibe?.expires_at]);

  const vibeColor = getVibeColor(currentVibe?.vibe || 'social');
  const displayName = profile?.display_name || profile?.username || 'Anonymous';
  const customStatus = profile?.custom_status;

  return (
    <Card className="relative overflow-hidden border-border/30 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm">
      {/* Vibe gradient background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at top right, ${vibeColor.replace('text-', 'hsl(var(--')})}, transparent 60%)`
        }}
      />
      
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Large Avatar */}
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border/50 shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Current vibe indicator */}
            {currentVibe?.vibe && (
              <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-background ${vibeColor.replace('text-', 'bg-')} shadow-lg`}>
                <div className="h-full w-full rounded-full animate-pulse opacity-50" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {displayName}
              </h2>
              {profile?.username && profile?.username !== displayName && (
                <p className="text-sm text-muted-foreground">
                  @{profile.username}
                </p>
              )}
            </div>

            {/* Custom Status */}
            {customStatus && (
              <p className="text-sm text-muted-foreground italic">
                "{customStatus}"
              </p>
            )}

            {/* Current Vibe & Availability */}
            <div className="flex flex-wrap gap-2">
              {currentVibe?.vibe && (
                <Badge variant="outline" className={`${vibeColor} border-current/20 bg-current/5`}>
                  <div className="h-2 w-2 rounded-full bg-current mr-1.5" />
                  {currentVibe.vibe}
                </Badge>
              )}
              
              {timeLeft && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  Available for {timeLeft}
                </Badge>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}