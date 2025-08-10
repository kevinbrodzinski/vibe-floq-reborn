import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleDateTimePicker } from '@/components/inputs/simple-date-time-picker';
import { Clock, MapPin, Edit3, Check, X } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { getVibeColor } from '@/utils/getVibeColor';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileHeroProps {
  profileId?: string;
}

export function ProfileHero({ profileId }: ProfileHeroProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = profileId || user?.id;
  const isOwnProfile = !profileId || profileId === user?.id;
  
  const { data: profile, isLoading: profileLoading } = useProfile(targetUserId);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);

  // Get current vibe and availability
  const { data: currentVibe } = useQuery({
    queryKey: ['current-vibe', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data } = await supabase
        .from('vibes_now')
        .select('vibe, expires_at')
        .eq('profile_id', targetUserId as any)
        .maybeSingle();
      
      return data;
    },
    enabled: !!targetUserId,
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Get user settings for availability
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-settings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data } = await supabase
        .from('user_settings')
        .select('available_until')
        .eq('profile_id', targetUserId as any)
        .maybeSingle();
      
      return data;
    },
    enabled: !!targetUserId,
  });

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const availableUntil = (userSettings as any)?.available_until || (currentVibe as any)?.expires_at;
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
  }, [(userSettings as any)?.available_until, (currentVibe as any)?.expires_at]);

  // Initialize status value when profile loads
  useEffect(() => {
    if (profile?.custom_status && !statusValue) {
      setStatusValue(profile.custom_status);
    }
  }, [profile?.custom_status, statusValue]);

  const handleStatusUpdate = async () => {
    if (!isOwnProfile || !targetUserId) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ custom_status: statusValue.trim() || null } as any)
        .eq('id', targetUserId as any);

      if (error) throw error;

      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
      setIsEditingStatus(false);
      
      toast({
        title: "Status updated",
        description: "Your custom status has been updated.",
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: "Update failed",
        description: "Failed to update your status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAvailabilityUpdate = async (date: Date | undefined) => {
    if (!isOwnProfile || !targetUserId) return;
    
    try {
      // Call edge function to update availability
      const { error } = await supabase.functions.invoke('update-availability', {
        body: { available_until: date?.toISOString() || null }
      });

      if (error) throw error;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['user-settings', targetUserId] });
      setIsEditingAvailability(false);
      
      toast({
        title: "Availability updated",
        description: date 
          ? `You're available until ${date.toLocaleString()}`
          : "Availability cleared",
      });
    } catch (error) {
      console.error('Failed to update availability:', error);
      toast({
        title: "Update failed", 
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  const vibeColor = getVibeColor(((currentVibe as any)?.vibe) || 'social');
  const displayName = profile?.display_name || profile?.username || 'Anonymous';
  const customStatus = profile?.custom_status;
  const isLoading = profileLoading || settingsLoading;

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-border/30 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

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
            {((currentVibe as any)?.vibe) && (
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
            <div className="space-y-2">
              {isEditingStatus && isOwnProfile ? (
                <div className="flex gap-2">
                  <Textarea
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    placeholder="What's your vibe?"
                    className="min-h-[60px] text-sm resize-none"
                    maxLength={100}
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={handleStatusUpdate} className="h-8">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingStatus(false);
                        setStatusValue(customStatus || '');
                      }}
                      className="h-8"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {customStatus ? (
                    <p className="text-sm text-muted-foreground italic">
                      "{customStatus}"
                    </p>
                  ) : isOwnProfile ? (
                    <p className="text-sm text-muted-foreground/60">
                      Add a custom status...
                    </p>
                  ) : null}
                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusValue(customStatus || '');
                        setIsEditingStatus(true);
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Current Vibe & Availability */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {((currentVibe as any)?.vibe) && (
                  <Badge variant="outline" className={`${vibeColor} border-current/20 bg-current/5`}>
                    <div className="h-2 w-2 rounded-full bg-current mr-1.5" />
                    {(currentVibe as any).vibe}
                  </Badge>
                )}
                
                {timeLeft && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Available for {timeLeft}
                  </Badge>
                )}
              </div>

              {/* Availability Editor */}
              {isOwnProfile && (
                <div className="flex items-center gap-2">
                  {isEditingAvailability ? (
                    <div className="flex-1">
                      <SimpleDateTimePicker
                        date={((userSettings as any)?.available_until) ? new Date((userSettings as any).available_until) : undefined}
                        onDateChange={handleAvailabilityUpdate}
                        placeholder="Set availability"
                        className="text-xs h-8"
                      />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingAvailability(true)}
                      className="text-xs h-6 text-muted-foreground hover:text-foreground"
                      >
                        {(userSettings as any)?.available_until ? 'Update availability' : 'Set availability'}
                      </Button>
                  )}
                </div>
              )}
            </div>

            {/* Interests */}
            {profile?.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.interests.slice(0, 3).map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-xs px-2 py-0.5">
                    {interest}
                  </Badge>
                ))}
                {profile.interests.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                    +{profile.interests.length - 3}
                  </Badge>
                )}
              </div>
            )}

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