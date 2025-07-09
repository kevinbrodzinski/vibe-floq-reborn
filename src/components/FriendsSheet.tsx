import { User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFriends } from '@/hooks/useFriends';
import { OnlineFriendRow } from '@/components/OnlineFriendRow';
import { useNavigate } from 'react-router-dom';

interface FriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFriendClick: () => void;
}

export const FriendsSheet = ({ open, onOpenChange, onAddFriendClick }: FriendsSheetProps) => {
  const { friends, friendCount, isLoading } = useFriends();
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    onOpenChange(false);
    // Navigate to settings when that screen exists
    // navigate('/settings');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Your friends
            {friendCount > 0 && (
              <Badge variant="secondary">{friendCount}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 py-4 space-y-6">
          {/* Online Friends Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Online now
            </h3>
            
            {isLoading ? (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ) : friends.length > 0 ? (
              <ul className="space-y-3">
                {friends.map(id => <OnlineFriendRow key={id} userId={id} />)}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No friends yet</p>
                <p className="text-sm">Add friends to see them here</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Pending Requests Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Pending requests
            </h3>
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No pending requests</p>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAddFriendClick} className="w-full">
            + Add by @username
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSettingsClick}
            className="w-full"
          >
            Settings & sign-out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};