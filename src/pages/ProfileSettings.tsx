
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
import { AchievementsSection } from '@/components/profile/AchievementsSection';
import { useProfile } from '@/hooks/useProfile';
import { useUsername } from '@/hooks/useUsername';
import { useAuth } from '@/providers/AuthProvider';
import { useAvatarManager } from '@/hooks/useAvatarManager';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { hasUsername, currentUser: userProfile } = useUsername();
  const { data: profile } = useProfile(user?.id);
  const avatarMgr = useAvatarManager();
  const queryClient = useQueryClient();

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
          <h1 className="text-lg font-semibold">Profile Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Hero - takes up 35% of screen real estate */}
          <div className="h-[35vh] min-h-[300px]">
            <ProfileHero />
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

          {/* Achievements Section */}
          <div className="space-y-4">
            <h2 className="text-base font-medium">Achievements</h2>
            <AchievementsSection />
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

          {/* Profile Form */}
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="text-center space-y-4">
              <Avatar className="w-24 h-24 mx-auto">
                {profile?.avatar_url ? (
                  <AvatarImage src={getAvatarUrl(profile.avatar_url, 256)} />
                ) : (
                  <AvatarFallback className="text-3xl">
                    {getInitials(profile?.display_name || 'U')}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <Button 
                variant="secondary" 
                onClick={() => avatarMgr.setOpen(true)}
              >
                {profile?.avatar_url ? 'Change avatar' : 'Add avatar'}
              </Button>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your display name is shown alongside your username
              </p>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Saving...' : 'Save Profile'}
            </Button>

            {/* Info */}
            <div className="text-sm text-muted-foreground text-center">
              <p>Your avatar will be automatically resized and optimized for fast loading.</p>
              <p className="mt-1">Supported formats: JPEG, PNG, WebP, GIF (max 5MB)</p>
            </div>

            {/* Debug: Transform CDN Tester */}
            {import.meta.env.MODE === 'development' && profile?.avatar_url && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-medium mb-4 text-center">Debug: Transform CDN</h3>
                <TransformCDNTester avatarPath={profile.avatar_url} />
              </div>
            )}
          </div>
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

export default ProfileSettings;
