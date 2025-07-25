import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, UserPlus, Settings, Upload, MessageSquare, User, Eye } from 'lucide-react';
import { useDebug } from '@/lib/useDebug';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRequests } from '@/hooks/useFriendRequests';
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

export const AvatarDropdown = () => {
  const [debug, setDebug] = useDebug();
  const [friendsSheetOpen, setFriendsSheetOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [messagesSheetOpen, setMessagesSheetOpen] = useState(false);
  const [favoritesSheetOpen, setFavoritesSheetOpen] = useState(false);
  const [watchlistSheetOpen, setWatchlistSheetOpen] = useState(false);
  
  const { user } = useAuth();
  
  // Use real friends data, pending requests, and unread messages for notification badge
  const { friendCount, profiles } = useFriends();
  const { pendingRequests } = useFriendRequests();
  const { data: unreadCounts = [] } = useUnreadDMCounts(user?.id || null);
  
  // Total notifications = pending friend requests + unread messages
  const totalUnreadMessages = unreadCounts.reduce((sum, uc) => sum + uc.unread_count, 0);
  const totalNotifications = pendingRequests.length + totalUnreadMessages;
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
          <DropdownMenuItem onSelect={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onSelect={() => navigate('/vibe')}>
            <Heart className="w-4 h-4 mr-2" />
            My vibe / status
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => setFavoritesSheetOpen(true)}>
            <Heart className="w-4 h-4 mr-2" />
            Favorites ({favorites.length})
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => setWatchlistSheetOpen(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Watchlist ({upcomingPlans.length})
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => setMessagesSheetOpen(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
            {totalUnreadMessages > 0 && (
              <AnimatedBadge 
                count={totalUnreadMessages}
                className="ml-auto"
              />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => {
            console.log('🔍 Friends button clicked');
            setFriendsSheetOpen(true);
          }}>
            <Users className="w-4 h-4 mr-2" />
            Friends ({friendCount})
            {pendingRequests.length > 0 && (
              <AnimatedBadge 
                count={pendingRequests.length}
                className="ml-auto"
              />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => setAddFriendOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            + Add friend...
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onSelect={() => avatarMgr.setOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Change avatar...
          </DropdownMenuItem>
          
          {import.meta.env.DEV && (
            <DropdownMenuItem onSelect={() => setDebug(v => !v)}>
              {debug ? 'Hide testing overlays' : 'Show testing overlays'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <FriendsSheet 
        open={friendsSheetOpen}
        onOpenChange={setFriendsSheetOpen}
        onAddFriendClick={() => {
          setFriendsSheetOpen(false);
          setAddFriendOpen(true);
        }}
      />

      <MessagesSheet 
        open={messagesSheetOpen}
        onOpenChange={setMessagesSheetOpen}
        onFriendsSheetOpen={() => setFriendsSheetOpen(true)}
      />

      <AddFriendModal 
        open={addFriendOpen}
        onOpenChange={setAddFriendOpen}
      />

      <FavoritesSheet
        open={favoritesSheetOpen}
        onOpenChange={setFavoritesSheetOpen}
      />

      <WatchlistSheet
        open={watchlistSheetOpen}
        onOpenChange={setWatchlistSheetOpen}
      />

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