
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Share2, MessageCircle, Calendar, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlanQuickActionsProps {
  planId: string;
  planTitle: string;
  isCreator: boolean;
  onEditPlan: () => void;
  onEditTimeline: () => void;
}

export function PlanQuickActions({ 
  planId, 
  planTitle, 
  isCreator, 
  onEditPlan,
  onEditTimeline 
}: PlanQuickActionsProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}/plans/${planId}`;
    try {
      await navigator.share({
        title: planTitle,
        text: `Check out this plan: ${planTitle}`,
        url: url,
      });
    } catch (error) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Plan link copied to clipboard",
      });
    }
  };

  const handleAddToCalendar = () => {
    // TODO: Implement calendar integration
    toast({
      title: "Coming soon",
      description: "Calendar integration will be available soon",
    });
  };

  const handleOpenChat = () => {
    // TODO: Navigate to plan chat
    toast({
      title: "Coming soon",
      description: "Plan chat will be available soon",
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
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddToCalendar}
          className="justify-start"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/plan/${planId}`, '_blank')}
          className="justify-start"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Editor
        </Button>
      </div>
    </Card>
  );
}
