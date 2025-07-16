import { useState } from "react";
import { Check, X, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";

type RSVPStatus = 'attending' | 'maybe' | 'not_attending' | 'pending';

interface RSVPCardProps {
  planId: string;
  planTitle: string;
  planDate: string;
  currentUserRSVP?: RSVPStatus;
  attendeeCount?: number;
  maybeCount?: number;
  onRSVPChange?: (status: RSVPStatus) => void;
  hasConflict?: boolean;
  className?: string;
}

export const RSVPCard = ({
  planId,
  planTitle,
  planDate,
  currentUserRSVP = 'pending',
  attendeeCount = 0,
  maybeCount = 0,
  onRSVPChange,
  hasConflict = false,
  className = ""
}: RSVPCardProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleRSVP = async (status: RSVPStatus) => {
    if (currentUserRSVP === status) return;
    
    setIsUpdating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onRSVPChange?.(status);
      
      const statusText = {
        attending: "attending",
        maybe: "maybe attending",
        not_attending: "not attending",
        pending: "pending"
      }[status];
      
      toast({
        title: "RSVP updated",
        description: `You're now marked as ${statusText}`,
      });
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast({
        variant: "destructive",
        title: "Failed to update RSVP",
        description: "Please try again"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: RSVPStatus) => {
    switch (status) {
      case 'attending': return 'text-green-400';
      case 'maybe': return 'text-yellow-400';
      case 'not_attending': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: RSVPStatus) => {
    switch (status) {
      case 'attending': return <Check className="w-4 h-4" />;
      case 'maybe': return <Clock className="w-4 h-4" />;
      case 'not_attending': return <X className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`${className}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium mb-1">{planTitle}</h3>
            <p className="text-sm text-muted-foreground">{planDate}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${getStatusColor(currentUserRSVP)}`}>
              {getStatusIcon(currentUserRSVP)}
              <span className="text-sm font-medium capitalize">
                {currentUserRSVP === 'not_attending' ? 'Not Going' : currentUserRSVP}
              </span>
            </div>
            <StatusBadge hasConflict={hasConflict} />
          </div>
        </div>

        {/* RSVP Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button
            variant={currentUserRSVP === 'attending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleRSVP('attending')}
            disabled={isUpdating}
            className={currentUserRSVP === 'attending' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 hover:border-green-300'}
          >
            <Check className="w-3 h-3 mr-1" />
            Going
          </Button>
          
          <Button
            variant={currentUserRSVP === 'maybe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleRSVP('maybe')}
            disabled={isUpdating}
            className={currentUserRSVP === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : 'hover:bg-yellow-50 hover:border-yellow-300'}
          >
            <Clock className="w-3 h-3 mr-1" />
            Maybe
          </Button>
          
          <Button
            variant={currentUserRSVP === 'not_attending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleRSVP('not_attending')}
            disabled={isUpdating}
            className={currentUserRSVP === 'not_attending' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50 hover:border-red-300'}
          >
            <X className="w-3 h-3 mr-1" />
            Can't Go
          </Button>
        </div>

        {/* Attendance Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              {attendeeCount} going
            </span>
            {maybeCount > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                {maybeCount} maybe
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};