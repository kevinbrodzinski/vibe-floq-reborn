import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MessageCircle, 
  MapPin, 
  Zap, 
  UserPlus, 
  Users, 
  Clock, 
  MapPinOff,
  Heart,
  Star,
  TrendingUp,
  Calendar,
  Coffee,
  Music,
  Camera,
  MoreVertical,
  Send,
  Users2,
  Target,
  Sparkles,
  Activity,
  Map,
  Gift,
  Shield,
  Bell,
  BellOff,
  MessageSquare,
  UserCheck,
  MapPin as LocationIcon,
  Activity as PulseIcon,
  Users as GroupIcon,
  Calendar as EventIcon,
  Heart as LikeIcon,
  Star as FavoriteIcon,
  TrendingUp as TrendingIcon,
  Gift as RewardIcon,
  Shield as PrivacyIcon,
  Bell as NotificationIcon,
  BellOff as MuteIcon,
  Send as InviteIcon,
  Users2 as MutualIcon,
  Target as GoalIcon,
  Sparkles as MagicIcon,
  Activity as StatsIcon,
  Map as LocationIcon2,
  Gift as PresentIcon,
  Settings,
  Trophy,
  Lightbulb,
  Eye,
  EyeOff
} from 'lucide-react';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useUserVibe } from '@/hooks/useUserVibe';
import { usePing } from '@/hooks/usePing';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { openNativeMaps } from '@/utils/nativeNavigation';
import { useState, useEffect } from 'react';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { vibeToHex } from '@/lib/vibe/color';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const UserProfileByUsername = () => {
  const { username } = useParams<{ username: string }>();
  const sendPing = usePing();
  const { toast } = useToast();
  const [dmOpen, setDmOpen] = useState(false);
  const currentUserId = useCurrentUserId();
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['user-by-username', username],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      
      console.log('🔍 Looking up username:', username);
      const { data, error } = await supabase.rpc('get_user_by_username', { 
        lookup_username: username 
      });
      
      console.log('📊 Profile lookup result:', { data, error, username });
      if (error) {
        console.error('❌ Profile lookup error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!username
  });

  // Always call hooks at the top level - fix for React hooks rules
  const profile = profiles?.[0];
  const { data: vibe } = useUserVibe(profile?.id);
  
  // Get friend status and online presence
  const { rows: friendsWithPresence, isFriend } = useUnifiedFriends();
  const { isUserOnline } = useUserPresence();
  
  // Check if user is online
  const isOnline = profile?.id ? isUserOnline(profile.id) : false;
  
  // For now, we'll skip the new user check since we don't have created_at
  // This could be added later by modifying the RPC function to include created_at
  const isNewUser = false; // profile?.created_at ? (Date.now() - new Date(profile.created_at).getTime()) < (48 * 60 * 60 * 1000) : false;
  
  // Format member since date - simplified since we don't have created_at
  const formatMemberSince = () => {
    return 'Member since recently';
  };

  // Enhanced demo data for friend profiles
  const demoStats = {
    friendCount: 42,
    mutualFriends: 8,
    lastActive: '2m ago',
    lastLocation: 'Echo Night Market',
    sharedFloqs: 3,
    sharedEvents: 1,
    // Friend-specific data
    recentVibes: [
      { vibe: 'hype', timestamp: '2h ago', location: 'Blue Bottle Coffee' },
      { vibe: 'chill', timestamp: '5h ago', location: 'Golden Gate Park' },
      { vibe: 'social', timestamp: '1d ago', location: 'Mission District' },
      { vibe: 'flowing', timestamp: '2d ago', location: 'Dolores Park' },
      { vibe: 'romantic', timestamp: '3d ago', location: 'Fisherman\'s Wharf' }
    ],
    preferredVibeCategory: 'Night Owl',
    recentAfterglows: [
      { title: 'Amazing night at Echo!', date: '2 days ago', vibe: 'hype' },
      { title: 'Chill vibes at the park', date: '5 days ago', vibe: 'chill' }
    ],
    recentFloqs: [
      { title: 'Coffee & Code', date: 'Today', status: 'active', vibe: 'social' },
      { title: 'Sunset Walk', date: 'Yesterday', status: 'completed', vibe: 'chill' },
      { title: 'Late Night Vibes', date: '3 days ago', status: 'completed', vibe: 'hype' }
    ],
    topLocations: [
      { name: 'Blue Bottle Coffee', visits: 12, vibe: 'social' },
      { name: 'Golden Gate Park', visits: 8, vibe: 'chill' },
      { name: 'Mission District', visits: 6, vibe: 'hype' }
    ],
    mutualFloqs: [
      { title: 'Coffee & Code', date: 'Today', participants: 4 },
      { title: 'Sunset Walk', date: 'Yesterday', participants: 2 }
    ],
    mutualPlans: [
      { title: 'Weekend Brunch', date: 'This weekend', status: 'confirmed' },
      { title: 'Movie Night', date: 'Next week', status: 'pending' }
    ],
    sharedResonanceScore: 85,
    inviteHistory: [
      { type: 'plan', title: 'Weekend Brunch', date: '3 days ago' },
      { type: 'floq', title: 'Coffee & Code', date: '1 week ago' }
    ],
    currentPlanParticipation: {
      title: 'Planning tonight with Blue Bottle crew',
      time: '8:00 PM',
      location: 'Blue Bottle Coffee',
      participants: 6
    }
  };

  // Enhanced demo data for self profile
  const selfProfileData = {
    // Quick Stats
    plansCreated: 12,
    plansJoined: 28,
    connectionsFormed: 15,
    wavesShared: 47,
    currentStreak: 5,
    
    // Vibe Analytics
    weeklyVibes: [
      { vibe: 'social', percentage: 60, emoji: '🤝' },
      { vibe: 'chill', percentage: 25, emoji: '😌' },
      { vibe: 'hype', percentage: 15, emoji: '🔥' }
    ],
    mostVibedPlaces: [
      { name: 'Blue Bottle Coffee', visits: 8, vibe: 'social' },
      { name: 'Golden Gate Park', visits: 5, vibe: 'chill' },
      { name: 'Mission District', visits: 3, vibe: 'hype' }
    ],
    vibeStreak: 7,
    mostResonantMoment: {
      title: 'Coffee & Code Night',
      date: '3 days ago',
      participants: 6,
      vibe: 'social'
    },
    
    // Achievements
    achievements: [
      { name: 'Night Owl', icon: '🦉', description: '5 late-night floqs this month', earned: true, shareable: true },
      { name: 'Connector', icon: '🔗', description: 'Connected with 20+ people', earned: true, shareable: true },
      { name: 'Explorer', icon: '🗺️', description: 'Visited 10 new places', earned: true, shareable: false },
      { name: 'First Floq', icon: '🎉', description: 'Created your first floq', earned: true, shareable: true },
      { name: 'Early Bird', icon: '🌅', description: 'Joined before public launch', earned: true, shareable: true },
      { name: 'Resonant Repeat', icon: '🔄', description: 'Met same person 3+ times', earned: false, shareable: true }
    ],
    
    // Smart Suggestions
    suggestions: [
      { type: 'plan', title: 'Coffee & Code floq', reason: 'starts in 30min', vibe: 'social' },
      { type: 'people', title: 'Sunset Walk with Sarah & Mike', reason: 'based on shared vibes', vibe: 'chill' },
      { type: 'venue', title: 'Mission District Night Market', reason: 'new venue near your favorite spots', vibe: 'hype' }
    ],
    
    // User's Floqs
    myFloqs: [
      { title: 'Coffee & Code', status: 'active', participants: 4, vibe: 'social', canLeave: false },
      { title: 'Sunset Walk', status: 'active', participants: 2, vibe: 'chill', canLeave: true },
      { title: 'Late Night Vibes', status: 'completed', participants: 6, vibe: 'hype', canLeave: false },
      { title: 'Weekend Brunch', status: 'upcoming', participants: 8, vibe: 'social', canLeave: true }
    ],
    
    // Privacy Settings
    privacySettings: {
      showVibeToFriends: true,
      shareLocationWithFloqs: true,
      incognitoVibes: false,
      showAchievementsOnProfile: true
    },
    
    // Current Status
    currentStatus: 'Planning night',
    availability: 'Open to Floqs'
  };

  if (!username) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"
      >
        <div className="text-center">
          <p className="text-gray-300 font-light">Invalid username</p>
          <Button onClick={() => window.history.back()} variant="outline" className="mt-4 border-purple-500 text-purple-300 hover:bg-purple-500/20">
            Go Back
          </Button>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"
      >
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-300 font-light">Loading profile...</p>
        </div>
      </motion.div>
    );
  }

  if (error || !profiles || !Array.isArray(profiles) || profiles.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"
      >
        <div className="text-center">
          <p className="text-gray-300 font-light">User not found</p>
          <Button onClick={() => window.history.back()} variant="outline" className="mt-4 border-purple-500 text-purple-300 hover:bg-purple-500/20">
            Go Back
          </Button>
        </div>
      </motion.div>
    );
  }

  const displayName = profile?.username ? `@${profile.username}` : profile?.display_name || 'Unknown User';
  const subtitle = profile?.username && profile?.display_name ? profile.display_name : null;
  
  const isOwnProfile = currentUserId === profile?.id;
  const isAlreadyFriend = profile?.id ? isFriend(profile.id) : false;
  
  const handlePing = () => {
    if (profile?.id) {
      sendPing(profile.id);
      toast({
        title: "Wave sent! ✨",
        description: `You waved at ${displayName}`,
      });
    }
  };
  
  const handleDM = () => {
    setDmOpen(true);
  };
  
  const handleNavigate = () => {
    if (vibe?.location) {
      openNativeMaps(vibe.location);
    }
  };

  const handleAddFriend = async () => {
    if (!profile?.id || isAddingFriend) return;
    
    setIsAddingFriend(true);
    
    try {
      const { error } = await supabase.rpc('send_friend_request', {
        _target: profile.id
      });
      
      if (error) {
        console.error('Failed to send friend request:', error);
        toast({
          title: "Failed to send friend request",
          description: "Please try again later",
          variant: 'destructive',
        });
      } else {
        toast({
          title: "Friend request sent! 👋",
          description: `Friend request sent to ${displayName}`,
        });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Connection error",
        description: "Check your internet connection and try again",
        variant: 'destructive',
      });
    } finally {
      setIsAddingFriend(false);
    }
  };

  const getVibeColor = (vibe: string) => {
    const colors = {
      hype: 'from-pink-500 to-purple-600',
      chill: 'from-blue-500 to-cyan-600',
      social: 'from-orange-500 to-yellow-600',
      flowing: 'from-green-500 to-emerald-600',
      romantic: 'from-red-500 to-pink-600',
      solo: 'from-indigo-500 to-purple-600',
      weird: 'from-purple-500 to-pink-600',
      down: 'from-gray-500 to-slate-600'
    };
    return colors[vibe as keyof typeof colors] || colors.social;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white"
    >
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-2 text-gray-300 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        {/* Self Profile View */}
        {isOwnProfile && (
          <>
            {/* Quick Actions Bar */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extralight">Quick Actions</h2>
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-300 font-light">
                  Personal
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" className="gap-2 border-blue-500 text-blue-300 hover:bg-blue-500/20 font-light">
                  <UserPlus className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-green-500 text-green-300 hover:bg-green-500/20 font-light">
                  <Send className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-purple-500 text-purple-300 hover:bg-purple-500/20 font-light">
                  <Settings className="h-4 w-4" />
                  Preferences
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-orange-500 text-orange-300 hover:bg-orange-500/20 font-light">
                  <Sparkles className="h-4 w-4" />
                  Customize Vibe
                </Button>
              </div>
              
              {/* Status & Availability */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-300" />
                    <span className="text-sm font-light">{selfProfileData.currentStatus}</span>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs font-light">
                    {selfProfileData.availability}
                  </Badge>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Cards */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-300" />
                <h2 className="text-lg font-extralight">Quick Stats</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="text-lg font-extralight text-blue-300">{selfProfileData.plansCreated}</div>
                  <div className="text-xs text-gray-400 font-light">Plans Created</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="text-lg font-extralight text-green-300">{selfProfileData.plansJoined}</div>
                  <div className="text-xs text-gray-400 font-light">Plans Joined</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="text-lg font-extralight text-purple-300">{selfProfileData.connectionsFormed}</div>
                  <div className="text-xs text-gray-400 font-light">Connections Formed</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="text-lg font-extralight text-orange-300">{selfProfileData.wavesShared}</div>
                  <div className="text-xs text-gray-400 font-light">Waves Shared</div>
                </div>
              </div>
              
              {/* Current Streak */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light">Current Streak</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extralight text-orange-400">{selfProfileData.currentStreak} days</span>
                    {selfProfileData.currentStreak >= 7 && (
                      <span className="text-orange-400">🔥</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Vibe Analytics Dashboard */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-purple-300" />
                <h2 className="text-lg font-extralight">Vibe Analytics</h2>
              </div>
              
              {/* Weekly Vibe Breakdown */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">This Week</h3>
                <div className="space-y-2">
                  {selfProfileData.weeklyVibes.map((vibeData, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <span className="text-lg">{vibeData.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-light capitalize">{vibeData.vibe}</span>
                          <span className="text-sm font-light">{vibeData.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${getVibeColor(vibeData.vibe)}`}
                            style={{ width: `${vibeData.percentage}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Most Vibed Places */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">Most Vibed Places</h3>
                <div className="space-y-2">
                  {selfProfileData.mostVibedPlaces.map((place, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Map className="h-4 w-4 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{place.name}</p>
                        <p className="text-xs text-gray-400 font-light">{place.visits} visits</p>
                      </div>
                      <Badge className={`bg-gradient-to-r ${getVibeColor(place.vibe)} text-white border-0 text-xs font-light`}>
                        {place.vibe}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Most Resonant Moment */}
              <div>
                <h3 className="text-sm font-light text-gray-400 mb-3">Most Resonant Moment</h3>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.3 }}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-white/10"
                >
                  <Heart className="h-4 w-4 text-pink-400" />
                  <div className="flex-1">
                    <p className="text-sm font-light">{selfProfileData.mostResonantMoment.title}</p>
                    <p className="text-xs text-gray-400 font-light">{selfProfileData.mostResonantMoment.date} • {selfProfileData.mostResonantMoment.participants} people</p>
                  </div>
                  <Badge className={`bg-gradient-to-r ${getVibeColor(selfProfileData.mostResonantMoment.vibe)} text-white border-0 text-xs font-light`}>
                    {selfProfileData.mostResonantMoment.vibe}
                  </Badge>
                </motion.div>
              </div>
            </motion.div>

            {/* My Floqs */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-green-300" />
                <h2 className="text-lg font-extralight">My Floqs</h2>
              </div>
              
              <div className="space-y-2">
                {selfProfileData.myFloqs.map((floq, index) => (
                  <motion.div 
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1.2 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                  >
                    <Coffee className="h-4 w-4 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm font-light">{floq.title}</p>
                      <p className="text-xs text-gray-400 font-light">{floq.participants} people • {floq.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`bg-gradient-to-r ${getVibeColor(floq.vibe)} text-white border-0 text-xs font-light`}>
                        {floq.vibe}
                      </Badge>
                      {floq.canLeave && (
                        <Button variant="outline" size="sm" className="h-6 px-2 border-red-500 text-red-300 hover:bg-red-500/20 text-xs font-light">
                          Leave
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-yellow-300" />
                <h2 className="text-lg font-extralight">Achievements</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {selfProfileData.achievements.map((achievement, index) => (
                  <motion.div 
                    key={index}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.3 + index * 0.1 }}
                    className={`p-3 rounded-xl border ${achievement.earned ? 'bg-black/20 border-white/10' : 'bg-black/10 border-gray-600/30 opacity-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{achievement.icon}</span>
                      <span className="text-sm font-light">{achievement.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-light mb-2">{achievement.description}</p>
                    {achievement.earned && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-green-500 text-green-300 font-light">
                          Earned
                        </Badge>
                        {achievement.shareable && (
                          <Button variant="outline" size="sm" className="h-5 px-2 border-blue-500 text-blue-300 hover:bg-blue-500/20 text-xs font-light">
                            Share
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Smart Suggestions */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-yellow-300" />
                <h2 className="text-lg font-extralight">Smart Suggestions</h2>
              </div>
              
              <div className="space-y-2">
                {selfProfileData.suggestions.map((suggestion, index) => (
                  <motion.div 
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1.4 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                  >
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getVibeColor(suggestion.vibe)}`} />
                    <div className="flex-1">
                      <p className="text-sm font-light">{suggestion.title}</p>
                      <p className="text-xs text-gray-400 font-light">{suggestion.reason}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 px-2 border-blue-500 text-blue-300 hover:bg-blue-500/20 text-xs font-light">
                      Join
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Privacy Controls */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-300" />
                <h2 className="text-lg font-extralight">Privacy & Preferences</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-300" />
                    <span className="text-sm font-light">Show vibe to friends</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full ${selfProfileData.privacySettings.showVibeToFriends ? 'bg-green-500' : 'bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${selfProfileData.privacySettings.showVibeToFriends ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-300" />
                    <span className="text-sm font-light">Share location with floqs</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full ${selfProfileData.privacySettings.shareLocationWithFloqs ? 'bg-green-500' : 'bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${selfProfileData.privacySettings.shareLocationWithFloqs ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-purple-300" />
                    <span className="text-sm font-light">Incognito vibes</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full ${selfProfileData.privacySettings.incognitoVibes ? 'bg-green-500' : 'bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${selfProfileData.privacySettings.incognitoVibes ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-300" />
                    <span className="text-sm font-light">Show achievements on profile</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full ${selfProfileData.privacySettings.showAchievementsOnProfile ? 'bg-green-500' : 'bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${selfProfileData.privacySettings.showAchievementsOnProfile ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Friend-Specific Sections */}
        {isAlreadyFriend && !isOwnProfile && (
          <>
            {/* Profile Vibe Map */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-300" />
                <h2 className="text-lg font-extralight">Profile Vibe Map</h2>
              </div>
              
              {/* Recent Vibes */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">Recent Vibes</h3>
                <div className="space-y-2">
                  {demoStats.recentVibes.map((vibeData, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getVibeColor(vibeData.vibe)}`} />
                      <div className="flex-1">
                        <p className="text-sm font-light capitalize">{vibeData.vibe}</p>
                        <p className="text-xs text-gray-400 font-light">{vibeData.location}</p>
                      </div>
                      <span className="text-xs text-gray-400 font-light">{vibeData.timestamp}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Preferred Vibe Category */}
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-light">Preferred: </span>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs font-light">
                  {demoStats.preferredVibeCategory}
                </Badge>
              </div>
            </motion.div>

            {/* Activity Recap */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-purple-300" />
                <h2 className="text-lg font-extralight">Activity Recap</h2>
              </div>
              
              {/* Recent Afterglows */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">Recent Afterglows</h3>
                <div className="space-y-2">
                  {demoStats.recentAfterglows.map((afterglow, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Heart className="h-4 w-4 text-pink-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{afterglow.title}</p>
                        <p className="text-xs text-gray-400 font-light">{afterglow.date}</p>
                      </div>
                      <Badge className={`bg-gradient-to-r ${getVibeColor(afterglow.vibe)} text-white border-0 text-xs font-light`}>
                        {afterglow.vibe}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Recent Floqs */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">Recent Floqs</h3>
                <div className="space-y-2">
                  {demoStats.recentFloqs.map((floq, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Coffee className="h-4 w-4 text-orange-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{floq.title}</p>
                        <p className="text-xs text-gray-400 font-light">{floq.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`bg-gradient-to-r ${getVibeColor(floq.vibe)} text-white border-0 text-xs font-light`}>
                          {floq.vibe}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-purple-500 text-purple-300 font-light">
                          {floq.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Top Locations */}
              <div>
                <h3 className="text-sm font-light text-gray-400 mb-3">Top Locations</h3>
                <div className="space-y-2">
                  {demoStats.topLocations.map((location, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.3 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Map className="h-4 w-4 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{location.name}</p>
                        <p className="text-xs text-gray-400 font-light">{location.visits} visits</p>
                      </div>
                      <Badge className={`bg-gradient-to-r ${getVibeColor(location.vibe)} text-white border-0 text-xs font-light`}>
                        {location.vibe}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Mutual Context */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Users2 className="h-5 w-5 text-purple-300" />
                <h2 className="text-lg font-extralight">Mutual Context</h2>
              </div>
              
              {/* Mutual Floqs */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">Mutual Floqs</h3>
                <div className="space-y-2">
                  {demoStats.mutualFloqs.map((floq, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.5 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Users className="h-4 w-4 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{floq.title}</p>
                        <p className="text-xs text-gray-400 font-light">{floq.date}</p>
                      </div>
                      <span className="text-xs text-gray-400 font-light">{floq.participants} people</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Mutual Plans */}
              <div>
                <h3 className="text-sm font-light text-gray-400 mb-3">Mutual Plans</h3>
                <div className="space-y-2">
                  {demoStats.mutualPlans.map((plan, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.6 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Calendar className="h-4 w-4 text-purple-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{plan.title}</p>
                        <p className="text-xs text-gray-400 font-light">{plan.date}</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-purple-500 text-purple-300 font-light">
                        {plan.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Custom Elements */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.7 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl shadow-black/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Gift className="h-5 w-5 text-purple-300" />
                <h2 className="text-lg font-extralight">Shared Resonance</h2>
              </div>
              
              {/* Shared Resonance Score */}
              <div className="mb-4">
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-light">Shared Resonance Score</p>
                    <p className="text-xs text-gray-400 font-light">You've vibed 3x this week</p>
                  </div>
                  <span className="text-lg font-extralight text-green-400">{demoStats.sharedResonanceScore}%</span>
                </div>
              </div>
              
              {/* Invite History */}
              <div className="mb-4">
                <h3 className="text-sm font-light text-gray-400 mb-3">Invite History</h3>
                <div className="space-y-2">
                  {demoStats.inviteHistory.map((invite, index) => (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.8 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/10"
                    >
                      <Send className="h-4 w-4 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-sm font-light">{invite.title}</p>
                        <p className="text-xs text-gray-400 font-light">{invite.date}</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-purple-500 text-purple-300 font-light">
                        {invite.type}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Current Plan Participation */}
              <div>
                <h3 className="text-sm font-light text-gray-400 mb-3">Current Plan</h3>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.9 }}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-white/10"
                >
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-sm font-light">{demoStats.currentPlanParticipation.title}</p>
                    <p className="text-xs text-gray-400 font-light">{demoStats.currentPlanParticipation.time} • {demoStats.currentPlanParticipation.location}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-light">{demoStats.currentPlanParticipation.participants} people</span>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
        
        {/* DM Quick Sheet */}
        <DMQuickSheet
          open={dmOpen}
          onOpenChange={setDmOpen}
          friendId={profile?.id || ''}
        />
      </div>
    </motion.div>
  );
};