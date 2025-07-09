import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, UserPlus } from 'lucide-react';
import { useDebug } from '@/lib/useDebug';
import { useFriends } from '@/hooks/useFriends';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { FriendsSheet } from './FriendsSheet';
import { AddFriendModal } from './AddFriendModal';

export const AvatarDropdown = () => {
  const [debug, setDebug] = useDebug();
  const [friendsSheetOpen, setFriendsSheetOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const { friendCount } = useFriends();
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <div className="w-12 h-12 rounded-full gradient-secondary border-2 border-primary/30 glow-secondary overflow-hidden cursor-pointer hover:scale-105 transition-smooth pointer-events-auto">
              <div className="w-full h-full bg-muted-foreground/10"></div>
            </div>
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
    </>
  );
};