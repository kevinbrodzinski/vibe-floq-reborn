import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, Users, Settings, Share2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { VibeRing } from '@/components/VibeRing';
import { usePlanShareLink } from '@/hooks/usePlanShareLink';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PlanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: {
    id: string;
    title: string;
    description?: string;
    planned_at: string;
    status: string;
    location?: any;
    vibe_tag?: string;
    creator_id: string;
    participants?: Array<{
      id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
      current_vibe?: string;
    }>;
    stops?: Array<{
      id: string;
      title: string;
      description?: string;
      location: any;
      stop_order: number;
    }>;
  };
  onInvite?: () => void;
  onEdit?: () => void;
}

export function PlanDetailSheet({ 
  open, 
  onOpenChange, 
  plan, 
  onInvite,
  onEdit 
}: PlanDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'stops' | 'participants'>('overview');
  const [participants, setParticipants] = useState(plan?.participants || []);
  const { trigger: createShareLink, isMutating: creatingLink } = usePlanShareLink(plan?.id || '');
  const { toast } = useToast();

  // Real-time participant updates
  useEffect(() => {
    if (!plan?.id || !open) return;

    const channel = supabase
      .channel(`plan-participants-${plan.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_participants',
          filter: `plan_id=eq.${plan.id}`,
        },
        async (payload) => {
          // Refresh participant list when changes occur
          const { data } = await supabase
            .from('plan_participants')
            .select(`
              user_id,
              profiles:user_id (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('plan_id', plan.id);

          if (data) {
            const updatedParticipants = data
              .map(p => p.profiles)
              .filter(Boolean)
              .map(profile => ({
                id: profile.id,
                username: profile.username || '',
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
                current_vibe: 'social', // Default vibe, can be enhanced with real user vibe
              }));

            setParticipants(updatedParticipants);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [plan?.id, open]);

  const handleShare = async () => {
    if (!plan?.id) return;

    try {
      const result = await createShareLink();
      await navigator.clipboard.writeText(result.url);
      
      toast({
        title: "Link copied!",
        description: "Plan invitation link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error creating share link",
        description: "Failed to create shareable link. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!plan) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {plan.title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-1 mb-6 mt-4">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="flex-1"
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'stops' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('stops')}
            className="flex-1"
          >
            Stops
          </Button>
          <Button
            variant={activeTab === 'participants' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('participants')}
            className="flex-1"
          >
            People
          </Button>
        </div>

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {plan.description && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(plan.planned_at), 'PPP p')}
                  </span>
                </div>

                {plan.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Starting location set</span>
                  </div>
                )}

                {plan.vibe_tag && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{plan.vibe_tag}</Badge>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {plan.participants?.length || 0} participants
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button onClick={onInvite} className="w-full" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Invite Friends
                </Button>
                
                <div className="flex gap-2">
                  <Button onClick={onEdit} variant="outline" className="flex-1">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleShare}
                    disabled={creatingLink}
                  >
                    {creatingLink ? (
                      <ExternalLink className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stops' && (
            <div className="space-y-3">
              {plan.stops && plan.stops.length > 0 ? (
                plan.stops
                  .sort((a, b) => a.stop_order - b.stop_order)
                  .map((stop, index) => (
                    <div key={stop.id} className="flex gap-3 p-3 rounded-lg border">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{stop.title}</h4>
                        {stop.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {stop.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No stops planned yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-3">
              {participants && participants.length > 0 ? (
                participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <VibeRing 
                      vibe={participant.current_vibe || plan.vibe_tag || 'social'} 
                      pulse={participant.id === plan.creator_id}
                      className="w-10 h-10"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={participant.avatar_url} />
                        <AvatarFallback>
                          {participant.display_name?.[0] || participant.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </VibeRing>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {participant.display_name || participant.username}
                      </p>
                      <div className="flex items-center gap-2">
                        {participant.display_name && (
                          <p className="text-xs text-muted-foreground">
                            @{participant.username}
                          </p>
                        )}
                        {participant.current_vibe && (
                          <Badge variant="outline" className="text-xs">
                            {participant.current_vibe}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {participant.id === plan.creator_id && (
                      <Badge variant="outline" className="text-xs">
                        Host
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No participants yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}