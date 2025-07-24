import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';

interface ShareToggleProps {
  friendId: string;
  initial: boolean;
}

export function ShareToggle({ friendId, initial }: ShareToggleProps) {
  const [on, setOn] = useState(initial);
  const [loading, setLoading] = useState(false);

  const change = async (val: boolean) => {
    setLoading(true);
    setOn(val);
    
    try {
      const { error } = await supabase.rpc('set_live_share', { 
        _friend: friendId, 
        _on: val 
      });
      
      if (error) {
        console.error('Error updating live share preference:', error);
        setOn(!val); // Revert on error
      }
    } catch (err) {
      console.error('Error updating live share preference:', err);
      setOn(!val); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch 
      checked={on} 
      disabled={loading} 
      onCheckedChange={change}
    />
  );
}