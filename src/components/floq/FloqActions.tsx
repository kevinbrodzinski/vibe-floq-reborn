import React from 'react';
import { UserPlus2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconPill } from '@/components/IconPill';
import { useFloqBoost } from '@/hooks/useFloqBoosts';
import { useToast } from '@/hooks/use-toast';

interface FloqActionsProps {
  floqId: string;
  isJoined: boolean;
  onInvite: () => void;
}

export const FloqActions: React.FC<FloqActionsProps> = ({ 
  floqId, 
  isJoined, 
  onInvite 
}) => {
  const { boost } = useFloqBoost();

  const handleBoost = () => {
    boost({ floqId });
  };

  if (!isJoined) return null;

  return (
    <div className="flex gap-2">
      <IconPill
        icon={<Zap className="w-3 h-3" />}
        label="Boost"
        onClick={handleBoost}
      />
      
      <IconPill
        icon={<UserPlus2 className="w-3 h-3" />}
        label="Invite"
        onClick={onInvite}
      />
    </div>
  );
};