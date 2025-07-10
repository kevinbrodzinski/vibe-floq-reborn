
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfileCache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl, getInitials } from '@/lib/avatar';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile(userId || '');

  if (!userId) {
    return <div>Invalid user ID</div>;
  }

  const displayName = profile?.username 
    ? `@${profile.username}`
    : profile?.display_name || 'Unknown User';

  const subtitle = profile?.username && profile?.display_name 
    ? profile.display_name 
    : null;

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
          <h1 className="text-lg font-semibold">User Profile</h1>
        </div>

        {/* Profile Content */}
        <div className="text-center py-12">
          {profile ? (
            <>
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={getAvatarUrl(profile.avatar_url, 96)} />
                <AvatarFallback className="text-xl">
                  {getInitials(profile.display_name || profile.username)}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-semibold mb-2">
                {displayName}
              </h2>
              
              {subtitle && (
                <p className="text-lg text-muted-foreground mb-4">
                  {subtitle}
                </p>
              )}
              
              <p className="text-sm text-muted-foreground mb-4">
                User ID: {userId}
              </p>
              
              <p className="text-sm text-muted-foreground">
                This is a stub profile page. Full profile implementation coming soon!
              </p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted animate-pulse" />
              <p className="text-muted-foreground">Loading profile...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
