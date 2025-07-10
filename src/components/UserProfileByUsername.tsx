import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';
import { getAvatarUrl, getInitials } from '@/lib/avatar';

export const UserProfileByUsername = () => {
  const { username } = useParams<{ username: string }>();
  
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
            
            <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
            {subtitle && (
              <p className="text-muted-foreground mb-4">{subtitle}</p>
            )}
            
            <div className="text-sm text-muted-foreground">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};