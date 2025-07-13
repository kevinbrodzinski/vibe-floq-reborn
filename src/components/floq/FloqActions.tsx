import React from 'react';
import { UserPlus2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconPill } from '@/components/IconPill';
import { supabase } from '@/integrations/supabase/client';
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
  const { toast } = useToast();

  const handleBoost = async () => {
    try {
      const { data, error } = await supabase.rpc('boost_floq', { 
        p_floq_id: floqId 
      });
      
      if (error) throw error;
      
      toast({
        title: "Floq boosted!",
        description: "Your boost will help more people find this floq",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to boost floq:', error);
      toast({
        title: "Boost failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
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