
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AvatarUpload } from '@/components/AvatarUpload';
import { TransformCDNTester } from '@/components/debug/TransformCDNTester';
import { UsernameStep } from '@/components/UsernameStep';
import { useProfile } from '@/hooks/useProfileCache';
import { useUsername } from '@/hooks/useUsername';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(supabase.auth.getUser());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { hasUsername, currentUser: userProfile } = useUsername();

  // Get current user's profile
  const userId = currentUser ? 'current' : '';
  const { data: profile, refetch } = useProfile(userId);

  // Initialize state from profile data
  useState(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url);
      setDisplayName(profile.display_name || '');
    }
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName,
          avatar_url: avatarUrl 
        })
        .eq('id', user.data.user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully"
      });

      // Refetch profile data
      refetch();
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
          {/* Username Section */}
          <div className="space-y-3">
            <h2 className="text-base font-medium">Username</h2>
            {hasUsername ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <span className="text-sm">@{userProfile?.username}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your username helps friends find you. Changing usernames is not currently supported.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <UsernameStep />
              </div>
            )}
          </div>

          <Separator />

          {/* Profile Form */}
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="text-center">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                displayName={displayName}
                onAvatarChange={setAvatarUrl}
                size={120}
              />
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
            {process.env.NODE_ENV === 'development' && avatarUrl && (
              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-medium mb-4 text-center">Debug: Transform CDN</h3>
                <TransformCDNTester avatarPath={avatarUrl} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
