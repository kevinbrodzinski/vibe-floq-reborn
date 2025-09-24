import React, { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Waves, 
  Users, 
  MapPin, 
  Clock, 
  Zap,
  Timer,
  UserCheck,
  Navigation
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ParticipantsAvatars } from '@/components/momentary/ParticipantsAvatars';

interface FloqPreview {
  id: string;
  title: string;
  creator_name: string;
  creator_avatar?: string;
  venue_name?: string;
  participant_count: number;
  ends_at: string;
  distance_m?: number;
  created_at: string;
}

export interface MomentaryFloqNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: {
    id: string;
    kind: string;
    payload: any;
    created_at: string;
  } | null;
}

export const MomentaryFloqNotificationModal: React.FC<MomentaryFloqNotificationModalProps> = ({
  open,
  onOpenChange,
  notification
}) => {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);

  // Fetch floq details when modal opens
  const { data: floqPreview, isLoading } = useQuery({
    queryKey: ['floq-preview', notification?.payload?.floq_id],
    queryFn: async (): Promise<FloqPreview | null> => {
      if (!notification?.payload?.floq_id) return null;
      
      const { data, error } = await supabase.rpc('get_floq_full_details', {
        p_floq_id: notification.payload.floq_id
      });

      if (error || !data?.[0]) return null;

      const floq = data[0];
      return {
        id: floq.id,
        title: floq.title || 'Untitled Floq',
        creator_name: notification.payload.friend_name || 'Someone',
        creator_avatar: null, // TODO: Get from payload if available
        venue_name: notification.payload.venue_name,
        participant_count: floq.participant_count || 0,
        ends_at: floq.ends_at,
        distance_m: notification.payload.distance_m,
        created_at: new Date().toISOString()
      };
    },
    enabled: open && !!notification?.payload?.floq_id,
    staleTime: 30000
  });

  const getNotificationTitle = () => {
    switch (notification?.kind) {
      case 'friend_started_floq_nearby':
        return `${notification.payload.friend_name} started a floq`;
      case 'momentary_floq_friend_joined':
        return `${notification.payload.friend_name} joined`;
      case 'wave_activity_friend':
        return 'Friends are gathering';
      case 'momentary_floq_nearby':
        return 'Floq happening nearby';
      default:
        return 'Momentary floq activity';
    }
  };

  const getTimeRemaining = () => {
    if (!floqPreview?.ends_at) return null;
    const end = new Date(floqPreview.ends_at);
    const now = new Date();
    const remaining = end.getTime() - now.getTime();
    
    if (remaining <= 0) return 'Ended';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const handleJoinFloq = async () => {
    if (!floqPreview) return;
    
    setIsJoining(true);
    try {
      // Join the floq
      const { error } = await supabase.rpc('rpc_session_join', {
        in_floq_id: floqPreview.id,
        in_checkin: 'here'
      });

      if (error) {
        console.error('Failed to join floq:', error);
        return;
      }

      // Navigate to the floq
      navigate(`/floqs/${floqPreview.id}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Exception joining floq:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewFloq = () => {
    if (!floqPreview) return;
    navigate(`/floqs/${floqPreview.id}`);
    onOpenChange(false);
  };

  const handleContinueSolo = () => {
    onOpenChange(false);
    // Could navigate to /discover or /field to continue exploring
  };

  if (!notification) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-primary" />
            {getNotificationTitle()}
          </DrawerTitle>
          <DrawerDescription>
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : floqPreview ? (
            <>
              {/* Floq Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{floqPreview.title}</h3>
                    {floqPreview.venue_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{floqPreview.venue_name}</span>
                      </div>
                    )}
                  </div>
                  {floqPreview.distance_m && (
                    <Badge variant="secondary">
                      {floqPreview.distance_m}m away
                    </Badge>
                  )}
                </div>

                {/* Time and participants */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span>{getTimeRemaining()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{floqPreview.participant_count} people</span>
                  </div>
                </div>

                {/* Participants preview */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Who's there</span>
                  <ParticipantsAvatars floqId={floqPreview.id} max={6} />
                </div>
              </div>

              <Separator />

              {/* Context based on notification type */}
              <div className="text-sm text-muted-foreground">
                {notification.kind === 'friend_started_floq_nearby' && (
                  "Your friend just started this floq. Join them for a spontaneous hangout!"
                )}
                {notification.kind === 'wave_activity_friend' && (
                  "There's a wave of activity where your friends are gathering. Perfect time to start or join a floq!"
                )}
                {notification.kind === 'momentary_floq_nearby' && (
                  "A momentary floq is happening close to you. Join the fun or keep exploring solo."
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Waves className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Floq details unavailable</p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleContinueSolo}
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Continue Solo
            </Button>
            
            {floqPreview && (
              <>
                {notification.kind === 'wave_activity_friend' ? (
                  <Button 
                    onClick={() => navigate('/discover')}
                    className="flex-1"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Discover
                  </Button>
                ) : (
                  <Button 
                    onClick={handleJoinFloq}
                    disabled={isJoining}
                    className="flex-1"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {isJoining ? 'Joining...' : 'Join Floq'}
                  </Button>
                )}
              </>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};