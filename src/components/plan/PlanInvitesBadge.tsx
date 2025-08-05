import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { usePendingInvitationCount } from '@/hooks/usePendingInvitations';

interface PlanInvitesBadgeProps {
  onClick: () => void;
  className?: string;
}

export function PlanInvitesBadge({ onClick, className }: PlanInvitesBadgeProps) {
  const count = usePendingInvitationCount();

  if (count === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`relative p-2 ${className}`}
      aria-label={`${count} pending invitation${count === 1 ? '' : 's'}`}
    >
      <Mail className="w-5 h-5" />
      <Badge 
        variant="destructive" 
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-medium flex items-center justify-center"
      >
        {count > 9 ? '9+' : count}
      </Badge>
    </Button>
  );
}