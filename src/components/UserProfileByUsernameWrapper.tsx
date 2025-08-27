import { useParams } from 'react-router-dom';
import { useProfileByUsername } from '@/hooks/useProfile';
import UserProfile from '@/pages/UserProfile';
import { Profile } from '@/types/profile';

const UserProfileByUsernameWrapper = () => {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = useProfileByUsername(username);
  const typedProfile = profile as Profile | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !typedProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">User @{username} not found</p>
        </div>
      </div>
    );
  }

  // Redirect to the new unified profile system using the profileId
  return <UserProfile profileId={(typedProfile as any).id} />;
};

export default UserProfileByUsernameWrapper;