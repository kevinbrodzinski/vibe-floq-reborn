
import React, { useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Share2, MessageCircle, Calendar, Copy, ExternalLink, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { addToCalendar, type CalendarEvent } from '@/lib/calendar';

interface PlanQuickActionsProps {
  planId: string;
  planTitle: string;
  planDescription?: string;
  startTime?: string;
  endTime?: string;
  isCreator: boolean;
  onEditPlan: () => void;
  onEditTimeline: () => void;
}

export function PlanQuickActions({ 
  planId, 
  planTitle, 
  planDescription,
  startTime,
  endTime,
  isCreator, 
  onEditPlan, 
  onEditTimeline 
}: PlanQuickActionsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const handleShare = async () => {
    const url = `${window.location.origin}/plans/${planId}`;
    if (typeof window !== 'undefined' && window.navigator?.share) {
      try {
        await navigator.share({
          title: planTitle,
          text: `Check out this plan: ${planTitle}`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Plan link copied to clipboard",
      });
    }
  };

  const handleAddToCalendar = (provider: 'google' | 'outlook' | 'ics') => {
    if (!startTime) {
      toast({
        title: "No start time",
        description: "This plan doesn't have a start time set",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(startTime);
    const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const calendarEvent: CalendarEvent = {
      title: planTitle,
      description: planDescription || `Join us for ${planTitle}`,
      startDate,
      endDate,
      url: `${window.location.origin}/plans/${planId}`,
    };

    try {
      addToCalendar(calendarEvent, provider);
      toast({
        title: "Added to calendar",
        description: `Plan added to ${provider === 'ics' ? 'calendar' : provider}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to calendar",
        variant: "destructive",
      });
    }
  };

  const handleOpenChat = () => {
    startTransition(() => {
      navigate(`/plan/${planId}`);
    });
  };

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3">Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {isCreator && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={onEditTimeline}
              className="justify-start"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Timeline
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onEditPlan}
              className="justify-start"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="justify-start"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Plan
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenChat}
          className="justify-start"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Group Chat
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add to Calendar
              <ChevronDown className="w-3 h-3 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleAddToCalendar('google')}>
              Google Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')}>
              Outlook Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddToCalendar('ics')}>
              Download .ics file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => startTransition(() => navigate(`/plan/${planId}`))}
          className="justify-start"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Editor
        </Button>
      </div>
    </Card>
  );
}
