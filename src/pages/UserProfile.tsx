
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Users, Users2, MapPin, Heart } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { DMQuickSheet } from '@/components/DMQuickSheet';
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

interface UserProfileProps {
  profileId?: string; // Allow profileId to be passed as prop
}

const UserProfile = ({ profileId: propProfileId }: UserProfileProps = {}) => {
  const { profileId: routeProfileId } = useParams<{ profileId: string }>();
  const profileId = propProfileId || routeProfileId;
  const currentUserId = useCurrentUserId();
  const [dmOpen, setDmOpen] = useState(false);
  
  const { data: profile, isLoading, error } = useProfile(profileId);
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

  // Display name logic
  const displayName = profile.username ? `@${profile.username}` : profile.display_name || 'Unknown User';
  const subtitle = profile.username && profile.display_name ? profile.display_name : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 pb-24">
      {/* Zone 0: App Bar */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => window.history.back()}
          className="text-white/80 hover:text-white transition-colors"
        >
          ✕
        </button>
        <h1 className="text-lg font-light text-white/90">Profile</h1>
        <div></div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4">
        {/* Zone 1: Hero Section - Pulse Style */}
        <div className="text-center pt-8 pb-6">
          <div className="relative">
            <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-white/20 shadow-2xl">
              <AvatarImage src={getAvatarUrl(profile.avatar_url, 128)} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                {getInitials(profile.display_name || profile.username)}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-400 text-green-900 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Online
                </div>
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-light text-white mb-2">{displayName}</h1>
          {subtitle && (
            <p className="text-purple-300 text-lg mb-1">@{profile.username}</p>
          )}
          
          {/* Socialite Level Badge - Pulse Style */}
          <div className="inline-flex items-center gap-2 bg-purple-600/30 border border-purple-400/30 rounded-full px-4 py-2 mt-3 mb-4">
            <span className="text-purple-300 font-medium">Socialite Level 4</span>
            <span className="text-purple-400">• 73/100</span>
          </div>
        </div>

        {/* Zone 2: Stats Grid - Pulse Style */}
        <div className="grid grid-cols-3 gap-4 px-4">
          <div className="text-center">
            <div className="text-2xl font-light text-white mb-1">{mockStats.friendCount}</div>
            <div className="text-sm text-purple-300">Check-ins this week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-white mb-1">{mockStats.sharedFloqs}</div>
            <div className="text-sm text-purple-300">Plans created</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-light text-white mb-1">{mockStats.mutualCount}</div>
            <div className="text-sm text-purple-300">Friends added</div>
          </div>
        </div>

        {/* Navigation Tabs - Pulse Style */}
        <div className="flex justify-center space-x-1 bg-gray-800/30 rounded-full p-1 mx-4 mt-8">
          <button className="px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-medium">
            Buzz
          </button>
          <button className="px-4 py-2 rounded-full text-gray-400 text-sm font-medium hover:text-white">
            Badges
          </button>
          <button className="px-4 py-2 rounded-full text-gray-400 text-sm font-medium hover:text-white">
            Plans
          </button>
          <button className="px-4 py-2 rounded-full text-gray-400 text-sm font-medium hover:text-white">
            History
          </button>
        </div>

        {/* Zone 3-4: Action Buttons */}
        {!isMe && (
          <div className="px-4 pt-4">
            {!isCurrentlyFriend && !pendingFromMe && !pendingToMe && (
              <div className="flex gap-3">
                <ActionBarNonFriend profile={profile} />
              </div>
            )}
            
            {pendingFromMe && (
              <div className="text-center py-4">
                <span className="text-yellow-300 text-sm">Friend request sent</span>
              </div>
            )}
            
            {pendingToMe && (
              <div className="flex gap-3">
                <button className="flex-1 bg-purple-600 text-white py-3 rounded-full font-medium">
                  Accept
                </button>
                <button className="flex-1 bg-gray-700 text-white py-3 rounded-full font-medium">
                  Decline
                </button>
              </div>
            )}
            
            {isCurrentlyFriend && (
              <div className="flex gap-3">
                <ActionBarFriend profile={profile} onOpenDM={() => setDmOpen(true)} />
              </div>
            )}
          </div>
        )}

        {/* Activity Feed - Pulse Style */}
        <div className="px-4 pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                📍
              </div>
              <div className="flex-1">
                <span className="text-white">Checked in at Blue Bottle Coffee</span>
                <span className="text-gray-400 ml-2">• 2h ago</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                📸
              </div>
              <div className="flex-1">
                <span className="text-white">Posted a photo from Mission District</span>
                <span className="text-gray-400 ml-2">• 5h ago</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                📅
              </div>
              <div className="flex-1">
                <span className="text-white">Joined Sarah's coffee plan</span>
                <span className="text-gray-400 ml-2">• 1d ago</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                💬
              </div>
              <div className="flex-1">
                <span className="text-white">Pinged Alex to hang out</span>
                <span className="text-gray-400 ml-2">• 2d ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* About Me Section */}
        <div className="px-4 pt-8">
          <h3 className="text-lg font-medium text-white mb-4">About Me</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Why I'm here</span>
              <span className="text-white">Discover new venues and meet like-minded people</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Relationship Status</span>
              <span className="text-white">Single</span>
            </div>
          </div>
        </div>

        {/* Action Buttons at Bottom - Pulse Style */}
        {!isMe && (
          <div className="fixed bottom-20 left-0 right-0 px-4">
            <div className="flex gap-4 max-w-md mx-auto">
              <button className="flex-1 bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-2">
                📥 Save
              </button>
              <button className="flex-1 bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-2">
                📤 Share
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DM Sheet */}
      {!isMe && (
        <DMQuickSheet
          open={dmOpen}
          onOpenChange={setDmOpen}
          friendId={profile.id}
        />
      )}
    </div>
  );
};

export default UserProfile;
