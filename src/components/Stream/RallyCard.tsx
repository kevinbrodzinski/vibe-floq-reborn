import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmartItem } from "@/types/stream";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface RallyCardProps {
  item: SmartItem;
  floqId: string;
}

export function RallyCard({ item, floqId }: RallyCardProps) {
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    creator_id,
    expires_at,
    venue_id,
    scope,
    note,
    minutes_until_expiry
  } = item.meta;

  const handleJoinRally = async () => {
    try {
      setIsJoining(true);
      
      // Create or update rally invite
      const { error } = await supabase
        .from('rally_invites')
        .upsert({
          rally_id: item.id,
          to_profile: (await supabase.auth.getUser()).data.user?.id!,
          status: 'joined'
        });

      if (error) throw error;

      toast({
        title: "Joined Rally!",
        description: "You're now part of this rally",
      });

      // Invalidate stream to update
      queryClient.invalidateQueries({ queryKey: ["smart-stream", floqId] });
      
    } catch (error) {
      console.error('Error joining rally:', error);
      toast({
        title: "Error",
        description: "Failed to join rally",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const isExpiringSoon = minutes_until_expiry <= 90 && minutes_until_expiry > 0;
  const isExpired = minutes_until_expiry <= 0;

  return (
    <Card className="relative overflow-hidden">
      {isExpiringSoon && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Rally</span>
                <Badge variant={scope === 'field' ? 'secondary' : 'default'} className="text-xs">
                  {scope === 'field' ? 'Field' : 'Floq'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Started {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isExpiringSoon && (
              <Badge variant="destructive" className="text-xs">
                {minutes_until_expiry}m left
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="text-xs">
                Expired
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {note && (
          <p className="text-sm mb-3 text-foreground/80">{note}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              Ends {formatDistanceToNow(new Date(expires_at), { addSuffix: true })}
            </span>
          </div>
          
          {venue_id && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>At venue</span>
            </div>
          )}
        </div>

        {!isExpired && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleJoinRally}
              disabled={isJoining}
              size="sm"
              className="flex-1"
            >
              {isJoining ? "Joining..." : "Join Rally"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            
            {isExpiringSoon && (
              <p className="text-xs text-orange-600 font-medium">
                Ends soon!
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}