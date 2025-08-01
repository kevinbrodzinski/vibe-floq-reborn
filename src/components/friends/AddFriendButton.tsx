import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';

type Status = 'none' | 'pending' | 'accepted' | 'blocked';

interface AddFriendButtonProps {
  status: Status;
  onAdd: () => void;
  isLoading?: boolean;
}

export function AddFriendButton({ status, onAdd, isLoading }: AddFriendButtonProps) {
  if (status === 'accepted') {
    return <Badge variant="secondary">Friends</Badge>;
  }

  if (status === 'pending') {
    return <Badge variant="outline">Requested</Badge>;
  }

  if (status === 'blocked') {
    return <Badge variant="destructive">Blocked</Badge>;
  }

  // status === 'none'
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onAdd}
      disabled={isLoading}
      className="flex items-center gap-1"
    >
      <UserPlus className="w-3 h-3" />
      Add
    </Button>
  );
}