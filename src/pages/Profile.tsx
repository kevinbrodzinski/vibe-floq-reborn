
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AvatarUpload } from '@/components/AvatarUpload';
import { TransformCDNTester } from '@/components/debug/TransformCDNTester';
import UsernameSettings from '@/components/settings/UsernameSettings';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { RecentActivity } from '@/components/profile/RecentActivity';
import { VibeHistorySparkline } from '@/components/analytics/VibeHistorySparkline';
import { VibePersonalityChart } from '@/components/analytics/VibePersonalityChart';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ConnectionInsights } from '@/components/ConnectionInsights';
import { AboutMeEditor } from '@/components/profile/AboutMeEditor';
import { PresenceSettings } from '@/components/profile/PresenceSettings';

import { RelationshipStrengthSummary } from '@/components/ui/RelationshipStrengthSummary';
import { ProfileSmartDiscovery } from '@/components/ui/ProfileSmartDiscovery';
import { ProfileAchievements } from '@/components/ui/ProfileAchievements';
import { useProfile } from '@/hooks/useProfile';
import { useUsername } from '@/hooks/useUsername';
import { useAuth } from '@/providers/AuthProvider';
import { useAvatarManager } from '@/hooks/useAvatarManager';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRelationshipStrength } from '@/hooks/useRelationshipStrength';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { hasUsername, currentUser: userProfile } = useUsername();
  const { data: profile } = useProfile(user?.id);
  const avatarMgr = useAvatarManager();
  const queryClient = useQueryClient();
  const { relationships } = useRelationshipStrength();

  // Initialize state from profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully"
      });

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">My Profile</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Hero - takes up 35% of screen real estate */}
          <div className="h-[35vh] min-h-[300px]">
            <ProfileHero />
          </div>

          <Separator />

          {/* Avatar & Display Name Section - Condensed */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                {profile?.avatar_url ? (
                  <AvatarImage src={getAvatarUrl(profile.avatar_url, 128)} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {getInitials(profile?.display_name || 'U')}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => avatarMgr.setOpen(true)}
                  className="text-xs"
                >
                  Change avatar
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported: JPEG, PNG, WebP, GIF (max 5MB)
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your display name is shown alongside your username
              </p>
            </div>
          </div>

          <Separator />

          {/* Username Section */}
          <UsernameSettings />

          <Separator />

          {/* Social Activity Dashboard */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">Your Activity</h2>
            <ProfileStats />
          </div>

          <Separator />

          {/* Vibe Analytics */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">Vibe Analytics</h2>
            <div className="grid gap-4">
              <VibeHistorySparkline />
              <VibePersonalityChart />
            </div>
          </div>

          <Separator />

          {/* Recent Activity */}
          <div className="space-y-4">
            <RecentActivity />
          </div>

          <Separator />

          {/* Connection Insights */}
          {profile && (
            <div className="space-y-4">
              <ConnectionInsights userId={profile.id} />
            </div>
          )}

          <Separator />

          {/* Relationship Strength Summary */}
          <div className="space-y-4">
            <RelationshipStrengthSummary relationships={relationships} />
          </div>

          <Separator />

          {/* Smart Discovery */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">Discover</h2>
            <ProfileSmartDiscovery />
          </div>

          <Separator />

          {/* Achievements Section */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">Achievements</h2>
            <ProfileAchievements />
          </div>

          <Separator />

          {/* About Me Editor */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">About Me</h2>
            <AboutMeEditor />
          </div>

          <Separator />

          {/* Presence Settings */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">Presence Settings</h2>
            <PresenceSettings />
          </div>

          <Separator />

          {/* Debug: Transform CDN Tester */}
          {import.meta.env.MODE === 'development' && profile?.avatar_url && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-4">Debug: Transform CDN</h3>
                <TransformCDNTester avatarPath={profile.avatar_url} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar upload sheet */}
      <Sheet open={avatarMgr.open} onOpenChange={avatarMgr.setOpen}>
        <SheetContent side="bottom" className="p-4">
          <div className="max-w-sm mx-auto">
            <h3 className="text-lg font-semibold text-center mb-4">Change Avatar</h3>
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url}
              displayName={profile?.display_name}
              onAvatarChange={async (newAvatarUrl) => {
                // Update the database with new avatar URL
                await supabase
                  .from('profiles')
                  .update({ avatar_url: newAvatarUrl })
                  .eq('id', user?.id);
                
                // Refresh the profile data
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                avatarMgr.setOpen(false);
              }}
              size={128}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
