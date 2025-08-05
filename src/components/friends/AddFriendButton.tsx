import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';

type Status = 'none' | 'pending_out' | 'pending_in' | 'friends';

interface AddFriendButtonProps {
  status: Status;
  onAdd: (e?: React.MouseEvent) => void;
  isLoading?: boolean;
}

export function AddFriendButton({ status, onAdd, isLoading }: AddFriendButtonProps) {
  if (status === 'friends') {
    return <Badge variant="secondary">Friends</Badge>;
  }

  if (status === 'pending_out') {
    return <Badge variant="outline">Requested</Badge>;
  }

  if (status === 'pending_in') {
    return <Badge variant="default">Accept</Badge>;
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