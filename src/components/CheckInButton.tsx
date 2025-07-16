import { useState } from "react";
import { MapPin, Check, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheckInButtonProps {
  planId: string;
  stopId: string;
  isCheckedIn?: boolean;
  onCheckInChange?: (checkedIn: boolean) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const CheckInButton = ({
  planId,
  stopId,
  isCheckedIn = false,
  onCheckInChange,
  variant = "default",
  size = "default",
  className = ""
}: CheckInButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(isCheckedIn);
  const { toast } = useToast();

  const handleCheckIn = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (checkedIn) {
        // Check out (remove record)
        const { error } = await supabase
          .from('plan_check_ins')
          .delete()
          .eq('plan_id', planId)
          .eq('stop_id', stopId)
          .eq('user_id', user.id);

        if (error) throw error;

        setCheckedIn(false);
        onCheckInChange?.(false);
        
        toast({
          title: "Checked out",
          description: "You've checked out of this stop",
        });
      } else {
        // Check in (create record)
        const { error } = await supabase
          .from('plan_check_ins')
          .insert({
            plan_id: planId,
            stop_id: stopId,
            user_id: user.id,
            checked_in_at: new Date().toISOString()
          });

        if (error) throw error;

        setCheckedIn(true);
        onCheckInChange?.(true);
        
        toast({
          title: "Checked in!",
          description: "You're now checked in at this stop",
        });
      }

      // Log activity
      await supabase
        .from('plan_activities')
        .insert({
          plan_id: planId,
          user_id: user.id,
          activity_type: checkedIn ? 'check_out' : 'check_in',
          entity_id: stopId,
          entity_type: 'stop',
          metadata: {
            timestamp: new Date().toISOString(),
            stop_id: stopId
          }
        });

    } catch (error) {
      console.error('Check-in error:', error);
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
          <span>{checkedIn ? 'Checking out...' : 'Checking in...'}</span>
        </>
      );
    }

    if (checkedIn) {
      return (
        <>
          <Check className="w-4 h-4" />
          <span>Checked In</span>
        </>
      );
    }

    return (
      <>
        <MapPin className="w-4 h-4" />
        <span>Check In</span>
      </>
    );
  };

  const getButtonVariant = () => {
    if (checkedIn) {
      return "default";
    }
    return variant;
  };

  const getButtonClasses = () => {
    const baseClasses = "transition-all duration-200";
    
    if (checkedIn) {
      return `${baseClasses} bg-green-600 hover:bg-green-700 text-white border-green-600`;
    }
    
    return baseClasses;
  };

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      onClick={handleCheckIn}
      disabled={isLoading}
      className={`${getButtonClasses()} ${className}`}
    >
      {getButtonContent()}
    </Button>
  );
};