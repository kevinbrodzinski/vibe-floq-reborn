
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Users, Users2, MapPin, Heart, Calendar, Clock, Flame, Compass, Sparkles } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { useLocationDuration } from '@/hooks/useLocationDuration';
import { useFriendshipInfo } from '@/hooks/useFriendshipInfo';
import { useUserDistance } from '@/hooks/useUserDistance';
import { useUserStreak } from '@/hooks/useUserStreak';
import { useUserAchievements } from '@/hooks/useUserAchievements';
import { RelationshipStrengthIndicator } from '@/components/ui/RelationshipStrengthIndicator';

// Zone components
import { GlassCard } from '@/components/profile/GlassCard';
import { StatPill } from '@/components/profile/StatPill';
import { ChipOnline } from '@/components/profile/ChipOnline';
import { ActionBarNonFriend } from '@/components/profile/ActionBarNonFriend';
import { ActionBarFriend } from '@/components/profile/ActionBarFriend';
import { LiveVibeCard } from '@/components/profile/LiveVibeCard';
import { MutualContext } from '@/components/profile/MutualContext';
import { Highlights } from '@/components/profile/Highlights';
import { FooterMemberSince } from '@/components/profile/FooterMemberSince';
import { AppBarBack } from '@/components/profile/AppBarBack';
import { FrequencyDisplay } from '@/components/profile/FrequencyDisplay';
import { ProfileChip } from '@/components/profile/ProfileChip';
import { VibeHalo } from '@/components/profile/VibeHalo';
import { QuickPingButton } from '@/components/profile/QuickPingButton';
import { LocationSharingBadge } from '@/components/profile/LocationSharingBadge';
import { CreateFloqSheet } from '@/components/CreateFloqSheet';
import { useFloqUI } from '@/contexts/FloqUIContext';

interface UserProfileProps {
  profileId?: string; // Allow profileId to be passed as prop
}

const UserProfile = ({ profileId: propProfileId }: UserProfileProps = {}) => {
  const { profileId: routeProfileId } = useParams<{ profileId: string }>();
  const profileId = propProfileId || routeProfileId;
  const currentUserId = useCurrentUserId();
  const [dmOpen, setDmOpen] = useState(false);
  const { setShowCreateSheet } = useFloqUI();
  
  const { data: profile, isLoading, error } = useProfile(profileId);
  const { data: locationDuration } = useLocationDuration(profileId);
  const { data: friendshipInfo } = useFriendshipInfo(profileId);
  const { data: distance } = useUserDistance(profileId);
  const { data: streak } = useUserStreak(profileId);
  const { data: achievements } = useUserAchievements(profileId);
  const { isFriend, rows: friendsData } = useUnifiedFriends();

  if (!profileId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid profile ID</p>
        </div>
      </div>
    );
  }

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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  // Conditional logic
  const isMe = profile.id === currentUserId;
  const isCurrentlyFriend = profile.id ? isFriend(profile.id) : false;
  
  // TODO: Get actual friendship data
  const friendship = null; // Replace with actual friendship query
  const pendingFromMe = false; // friendship?.state === 'pending' && friendship.requester === currentUserId
  const pendingToMe = false; // friendship?.state === 'pending' && friendship.requester !== currentUserId

  // Mock data for demonstration
  const mockStats = {
    friendCount: 42,
    mutualCount: 8,
    sharedFloqs: 3,
    resonanceScore: 85,
  };

  const mockLiveVibe = {
    vibe: 'social',
    timestamp: new Date().toISOString(),
    location: 'Blue Bottle Coffee',
  };

  const isOnline = true; // TODO: Get actual presence data

  // Display name logic - display name first, then username
  const displayName = profile.display_name || profile.username || 'Unknown User';
  const username = profile.username;

  const handleQuickFloq = () => {
    // Pre-fill the Create Floq sheet with this user
    setShowCreateSheet(true);
    // TODO: Add logic to pre-populate participants with current user and profile
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0E19] via-[#050713] to-[#0B0E19] pb-24">
      {/* Zone 0: App Bar */}
      <AppBarBack title="Profile" />

      <div className="max-w-md mx-auto px-4 space-y-4">
        {/* Zone 1: Hero Card */}
        <GlassCard center className="relative">
          {/* Gradient backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(101,56,255,0.2),transparent)] rounded-3xl" />
          
          {/* Online pill in top right */}
          {isOnline && (
            <div className="absolute top-4 right-4">
              <ChipOnline />
            </div>
          )}
          
          {/* Location sharing badge - top left */}
          <LocationSharingBadge
            profileId={profileId}
            className="z-10"
          />
          
          {/* Avatar without vibe halo */}
          <div className="relative mb-4">
            <Avatar className="w-32 h-32 mx-auto bg-surface border border-white/10">
              <AvatarImage src={getAvatarUrl(profile.avatar_url, 128)} />
              <AvatarFallback className="text-2xl">
                {getInitials(profile.display_name || profile.username)}
              </AvatarFallback>
            </Avatar>
            
            {/* Quick ping button */}
            {!isMe && <QuickPingButton targetId={profile.id} />}
          </div>
          
          <h1 className="text-white text-xl font-medium mb-1">{displayName}</h1>
          {username && (
            <p className="text-gray-400 text-sm mb-3">@{username}</p>
          )}
          
          {/* Social stats - Friends and Mutual */}
          <div className="flex items-center justify-center gap-6 mb-3">
            <div className="flex flex-col items-center gap-1">
              <Users className="h-4 w-4 text-purple-300/70" />
              <span className="text-sm font-medium text-gray-100">{mockStats.friendCount}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">friends</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Users2 className="h-4 w-4 text-purple-300/70" />
              <span className="text-sm font-medium text-gray-100">{mockStats.mutualCount}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">mutual</span>
            </div>
          </div>
          
          {profile.bio && (
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">{profile.bio}</p>
          )}
          
          {/* Status info with text and icons */}
          <div className="flex flex-col items-center gap-2 mb-3">
            {distance && (
              <div className="flex items-center gap-1 text-sm text-gray-300">
                <Compass className="h-4 w-4" />
                <span>{distance.distance} {distance.unit} away</span>
              </div>
            )}
            {streak && streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-300">
                <Flame className="h-4 w-4" />
                <span>{streak.currentStreak} d</span>
              </div>
            )}
            {isCurrentlyFriend && (
              <div className="flex items-center gap-1 text-sm text-emerald-300">
                <Sparkles className="h-4 w-4" />
                <span>close friend</span>
              </div>
            )}
          </div>
          {/* Location info */}
          {mockLiveVibe.location && (
            <div className="flex flex-col items-center gap-1 text-sm text-gray-400 mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{mockLiveVibe.location}</span>
              </div>
              {locationDuration && (
                <span className="text-xs text-gray-500">
                  for {locationDuration.duration}
                </span>
              )}
            </div>
          )}
          
          {/* Mini achievements */}
          {achievements && achievements.length > 0 && (
            <div className="flex justify-center gap-2 mb-3">
              {achievements.slice(0, 3).map(achievement => (
                <span 
                  key={achievement.id} 
                  title={achievement.name}
                  className="text-lg hover:scale-110 transition-transform cursor-pointer"
                >
                  {achievement.icon}
                </span>
              ))}
            </div>
          )}
          
          {/* Friendship Info */}
          {!isMe && friendshipInfo?.isFriend && (
            <div className="mt-3 space-y-1">
              {friendshipInfo.friendsSince && (
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>Friends since {new Date(friendshipInfo.friendsSince).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}</span>
                </div>
              )}
              {friendshipInfo.daysSinceLastHang !== null && (
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>
                    {friendshipInfo.daysSinceLastHang === 0 
                      ? 'Last hung out today'
                      : friendshipInfo.daysSinceLastHang === 1
                      ? 'Last hung out yesterday'
                      : `${friendshipInfo.daysSinceLastHang} days since last hang`
                    }
                  </span>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Zone 2: Social Stats Strip - Floqs and Resonance only */}
        <div className="grid grid-cols-2 gap-3">
          <StatPill value={mockStats.sharedFloqs} label="Floqs" icon={MapPin} />
          <StatPill value={`${mockStats.resonanceScore}%`} label="Resonance" icon={Heart} />
        </div>

        {/* Zone 3: CTA Bar (non-friend only) */}
        {!isMe && !isCurrentlyFriend && !pendingFromMe && !pendingToMe && (
          <ActionBarNonFriend profile={profile} />
        )}

        {/* Pending states */}
        {!isMe && pendingFromMe && (
          <GlassCard>
            <div className="flex items-center justify-center gap-2">
              <span className="text-yellow-300">Request sent</span>
              {/* TODO: Add cancel button */}
            </div>
          </GlassCard>
        )}

        {!isMe && pendingToMe && (
          <GlassCard>
            <div className="flex gap-3">
              {/* TODO: Add Accept and Decline buttons */}
              <span className="text-blue-300">Friend request received</span>
            </div>
          </GlassCard>
        )}

        {/* Zone 4: Friend Action Bar */}
        {!isMe && isCurrentlyFriend && (
          <ActionBarFriend profile={profile} onOpenDM={() => setDmOpen(true)} />
        )}

        {/* Zone 5: Live Vibe Card (friend only) */}
        {!isMe && isCurrentlyFriend && (
          <LiveVibeCard vibe={mockLiveVibe} />
        )}

        {/* Zone 6: Mutual Context (friend only) */}
        {!isMe && isCurrentlyFriend && (
          <MutualContext friendId={profile.id} />
        )}

        {/* Zone 7: Highlights (always visible) */}
        <Highlights userId={profile.id} isFriend={isCurrentlyFriend} />

        {/* Frequency Display: Most visited venues, locations, activities */}
        <FrequencyDisplay userId={profile.id} />

        {/* Zone 8: Relationship Panel (friend only) */}
        {!isMe && isCurrentlyFriend && (
          <GlassCard>
            <RelationshipStrengthIndicator 
              relationship={{
                profileId: profile.id,
                displayName: profile.display_name || profile.username,
                avatarUrl: profile.avatar_url,
                strength: mockStats.resonanceScore,
                interactionCount: 12,
                lastInteraction: new Date().toISOString(),
                mutualFriends: mockStats.mutualCount,
                sharedInterests: ['coffee', 'coding', 'music'],
                isPublic: true,
              }}
            />
          </GlassCard>
        )}

        {/* Zone 9: Footer */}
        <FooterMemberSince createdAt={profile.created_at} />
      </div>

      {/* DM Sheet */}
      {!isMe && (
        <DMQuickSheet
          open={dmOpen}
          onOpenChange={setDmOpen}
          friendId={profile.id}
        />
      )}
      
      {/* Create Floq Sheet - Controlled by FloqUI context */}
      <CreateFloqSheet />
    </div>
  );
};

export default UserProfile;
