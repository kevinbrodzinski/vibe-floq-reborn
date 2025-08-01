import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, UserPlus, Settings, Upload, MessageSquare, User, Eye, AudioLines, Share2, Search } from 'lucide-react';
import { useDebug } from '@/lib/useDebug';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/providers/AuthProvider';
import { useAvatarManager } from '@/hooks/useAvatarManager';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { AnimatedBadge } from '@/components/ui/animated-badge';
import { AvatarWithFallback } from '@/components/ui/avatar-with-fallback';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FriendsSheet } from './FriendsSheet';
import { AddFriendModal } from './AddFriendModal';
import { MessagesSheet } from './MessagesSheet';
import { AvatarUpload } from './AvatarUpload';
import { FavoritesSheet } from './ui/FavoritesSheet';
import { WatchlistSheet } from './ui/WatchlistSheet';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchlist } from '@/hooks/useWatchlist';
import DiscoverSheet from './friends/DiscoverSheet';

// Type for tracking which sheet is currently open
type ActiveSheet = 'friends' | 'discover' | 'messages' | 'favorites' | 'watchlist' | null

export const AvatarDropdown = () => {
  const [debug, setDebug] = useDebug();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  const { user } = useAuth();

  // Use real friends data, pending requests, and unread messages for notification badge
  const { friendIds, rows } = useUnifiedFriends();
  const { pendingIn } = useUnifiedFriends();
  const { data: unreadCounts = [] } = useUnreadDMCounts(user?.id || null);

  // Total notifications = pending friend requests + unread messages
  const totalUnreadMessages = unreadCounts.reduce((sum, uc) => sum + uc.cnt, 0);
  const totalNotifications = pendingIn.length + totalUnreadMessages;
  const { data: profile } = useProfile(user?.id);

  // Get favorites and watchlist counts
  const { favorites } = useFavorites();
  const { upcomingPlans } = useWatchlist();

  const avatarMgr = useAvatarManager();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <AvatarWithFallback
              src={profile?.avatar_url ? getAvatarUrl(profile.avatar_url, 64) : null}
              fallbackText={profile?.display_name || 'U'}
              className="w-12 h-12 cursor-pointer hover:scale-105 transition-smooth pointer-events-auto border-2 border-primary/30 glow-secondary"
            />
            {totalNotifications > 0 && (
              <AnimatedBadge
                count={totalNotifications}
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] text-xs flex items-center justify-center px-1 pointer-events-none font-medium"
              />
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="pointer-events-auto w-56">
          {/* Core Identity Section */}
          <DropdownMenuItem onSelect={() => navigate('/profile')} className="h-11">
            <User className="w-6 h-6 mr-3" />
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => navigate('/vibe')} className="h-11">
            <AudioLines className="w-6 h-6 mr-3" />
            Vibe
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          {/* Social Actions Section */}
          <DropdownMenuItem onSelect={() => {
            console.log('📨 Messages button clicked');
            setActiveSheet('messages');
          }} className="h-11" aria-label="Open messages">
            <MessageSquare className="w-6 h-6 mr-3" />
            Messages
            {totalUnreadMessages > 0 && (
              <AnimatedBadge
                count={totalUnreadMessages}
                className="ml-auto"
              />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => {
            console.log('👥 Friends button clicked');
            setActiveSheet('friends');
          }} className="h-11" aria-label="Open friends list">
            <Users className="w-6 h-6 mr-3" />
            Friends ({friendIds.length})
            {pendingIn.length > 0 && (
              <AnimatedBadge
                count={pendingIn.length}
                className="ml-auto"
              />
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => {
            console.log('🔍 Discover button clicked');
            setActiveSheet('discover');
          }} className="h-11" aria-label="Discover people">
            <UserPlus className="w-6 h-6 mr-3" />
            Discover People
          </DropdownMenuItem>

          {/* Personal Curation Section */}
          <DropdownMenuItem onSelect={() => {
            console.log('❤️ Favorites button clicked');
            setActiveSheet('favorites');
          }} className="h-11" aria-label="Open favorites">
            <Heart className="w-6 h-6 mr-3" />
            Favorites ({favorites.length})
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => {
            console.log('👁️ Watchlist button clicked');
            setActiveSheet('watchlist');
          }} className="h-11" aria-label="Open watchlist">
            <Eye className="w-6 h-6 mr-3" />
            Watchlist ({upcomingPlans.length})
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          {/* Settings & Debug Section */}
          <DropdownMenuItem onSelect={() => navigate('/location-sharing')} className="h-11">
            <Share2 className="w-6 h-6 mr-3" />
            Location Sharing
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => navigate('/settings')} className="h-11">
            <Settings className="w-6 h-6 mr-3" />
            Settings
          </DropdownMenuItem>

          {import.meta.env.DEV && (
            <DropdownMenuItem onSelect={() => setDebug(v => !v)} className="h-11">
              {debug ? 'Hide testing overlays' : 'Show testing overlays'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <FriendsSheet
        open={activeSheet === 'friends'}
        onOpenChange={(open) => setActiveSheet(open ? 'friends' : null)}
        onAddFriendClick={() => {
          setActiveSheet(null);
          setAddFriendOpen(true);
        }}
      />

      <MessagesSheet
        open={activeSheet === 'messages'}
        onOpenChange={(open) => setActiveSheet(open ? 'messages' : null)}
        onFriendsSheetOpen={() => setActiveSheet('friends')}
      />

      <AddFriendModal
        open={addFriendOpen}
        onOpenChange={setAddFriendOpen}
      />

      <FavoritesSheet
        open={activeSheet === 'favorites'}
        onOpenChange={(open) => setActiveSheet(open ? 'favorites' : null)}
      />

      <WatchlistSheet
        open={activeSheet === 'watchlist'}
        onOpenChange={(open) => setActiveSheet(open ? 'watchlist' : null)}
      />

      <Sheet open={activeSheet === 'discover'} onOpenChange={(open) => setActiveSheet(open ? 'discover' : null)}>
        <DiscoverSheet />
      </Sheet>

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
                const { error } = await supabase
                  .from('profiles')
                  .update({ avatar_url: newAvatarUrl } as any)
                  .eq('id', user?.id as any);

                if (error) {
                  console.error('Failed to update avatar:', error);
                  return;
                }

                // Refresh the profile data
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                avatarMgr.setOpen(false);
              }}
              size={128}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};