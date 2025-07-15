import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, MapPin, Zap } from 'lucide-react';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useUserVibe } from '@/hooks/useUserVibe';
import { usePing } from '@/hooks/usePing';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { openNativeMaps } from '@/utils/nativeNavigation';
import { useState, useEffect } from 'react';

export const UserProfileByUsername = () => {
  const { username } = useParams<{ username: string }>();
  const sendPing = usePing();
  const [dmOpen, setDmOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['user-by-username', username],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      
      const { data, error } = await supabase.rpc('get_user_by_username', { 
        lookup_username: username 
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!username
  });

  if (!username) {
    return <Navigate to="/404" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profiles || profiles.length === 0) {
    return <Navigate to="/404" replace />;
  }

  const profile = profiles[0];
  const displayName = profile.username ? `@${profile.username}` : profile.display_name || 'Unknown User';
  const subtitle = profile.username && profile.display_name ? profile.display_name : null;
  
  // Fetch current user vibe data
  const { data: vibe } = useUserVibe(profile.id);
  
  // Get current user ID for actions
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);
  
  const isOwnProfile = currentUserId === profile.id;
  
  const handlePing = () => {
    sendPing(profile.id);
  };
  
  const handleDM = () => {
    setDmOpen(true);
  };
  
  const handleNavigate = () => {
    if (vibe?.location) {
      openNativeMaps(vibe.location);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={getAvatarUrl(profile.avatar_url, 96)} />
              <AvatarFallback className="text-xl">
                {getInitials(profile.display_name || profile.username)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {vibe?.vibe && (
                <Badge variant="secondary" className="capitalize">
                  {vibe.vibe}
                </Badge>
              )}
            </div>
            
            {subtitle && (
              <p className="text-muted-foreground mb-2">{subtitle}</p>
            )}
            
            {profile.bio && (
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {profile.bio}
              </p>
            )}
            
            <div className="text-sm text-muted-foreground mb-6">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </div>
            
            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex gap-3 justify-center">
                <Button onClick={handlePing} variant="default" size="sm" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Wave
                </Button>
                <Button onClick={handleDM} variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
                {vibe?.location && (
                  <Button onClick={handleNavigate} variant="outline" size="sm" className="gap-2">
                    <MapPin className="h-4 w-4" />
                    Navigate
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* DM Quick Sheet */}
        <DMQuickSheet
          open={dmOpen}
          onOpenChange={setDmOpen}
          friendId={profile.id}
        />
      </div>
    </div>
  );
};