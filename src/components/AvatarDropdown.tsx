import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, UserPlus, Settings, Upload } from 'lucide-react';
import { useDebug } from '@/lib/useDebug';
import { useFriends } from '@/hooks/useFriends';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FriendsSheet } from './FriendsSheet';
import { AddFriendModal } from './AddFriendModal';
import { AvatarUpload } from './AvatarUpload';

export const AvatarDropdown = () => {
  const [debug, setDebug] = useDebug();
  const [friendsSheetOpen, setFriendsSheetOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  
  // 6.4 - Use real friends data with profile information
  const { friendCount, profiles } = useFriends();
  
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  
  const avatarMgr = useAvatarManager();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <Avatar className="w-12 h-12 cursor-pointer hover:scale-105 transition-smooth pointer-events-auto border-2 border-primary/30 glow-secondary">
              {profile?.avatar_url ? (
                <AvatarImage 
                  src={getAvatarUrl(profile.avatar_url, 64)} 
                  onError={(e) => {
                    // Graceful avatar degradation - fallback to initials if image fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="gradient-secondary">
                {getInitials(profile?.display_name || 'U')}
              </AvatarFallback>
            </Avatar>
            {friendCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] text-xs flex items-center justify-center p-0 pointer-events-none font-medium"
                role="status"
                aria-label={`${friendCount} friend${friendCount === 1 ? '' : 's'}`}
              >
                {friendCount > 99 ? '99+' : friendCount}
              </Badge>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="pointer-events-auto w-56">
          <DropdownMenuItem onSelect={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Profile / Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onSelect={() => navigate('/vibe')}>
            <Heart className="w-4 h-4 mr-2" />
            My vibe / status
          </DropdownMenuItem>
          
          <DropdownMenuItem onSelect={() => setFriendsSheetOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Friends ({friendCount})
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

      <AddFriendModal 
        open={addFriendOpen}
        onOpenChange={setAddFriendOpen}
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
    </>
  );
};