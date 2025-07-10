import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/AvatarUpload';
import { TransformCDNTester } from '@/components/debug/TransformCDNTester';
import { useProfile } from '@/hooks/useProfileCache';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(supabase.auth.getUser());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get current user's profile
  const userId = currentUser ? 'current' : ''; // This is a placeholder
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
  );
};

export default ProfileSettings;