import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  MapPin, 
  Clock, 
  Vote, 
  Bell, 
  MoreHorizontal,
  Navigation,
  Shuffle,
  Plus
} from "lucide-react";
import { ConstellationMap } from "../visual/ConstellationMap";
import { MemberStatusDashboard } from "./MemberStatusDashboard";
import { DecisionVotingSystem } from "./DecisionVotingSystem";
import { useFloqMembers } from "@/hooks/useFloqMembers";
import type { FloqCardItem } from "../cards/FloqCard";
import type { AvatarItem } from "../visual/AvatarStack";

interface FloqCommandCenterProps {
  item: FloqCardItem;
  onAction?: (action: string, data?: any) => void;
}

export function FloqCommandCenter({ item, onAction }: FloqCommandCenterProps) {
  const [activeTab, setActiveTab] = React.useState("constellation");
  const { data: members = [] } = useFloqMembers(item.id);
  
  // Convert members to AvatarItem format for constellation
  const memberAvatars: AvatarItem[] = React.useMemo(() => 
    members.map(member => ({
      id: member.profile_id,
      name: member.profiles?.display_name || member.profiles?.username || "Unknown",
      imageUrl: member.profiles?.avatar_url || null,
      floqId: item.id
    })),
    [members, item.id]
  );

  const currentUserId = "current-user"; // Would come from auth context
  
  // Mock coordination actions
  const coordinationActions = [
    { 
      id: "rally", 
      label: "Set Rally Point", 
      icon: MapPin, 
      description: "Choose where everyone meets" 
    },
    { 
      id: "notify", 
      label: "Notify Stragglers", 
      icon: Bell, 
      description: "Send push to inactive members" 
    },
    { 
      id: "extend", 
      label: "Extend TTL", 
      icon: Clock, 
      description: "Keep the flock alive longer" 
    },
    { 
      id: "split", 
      label: "Split Group", 
      icon: Shuffle, 
      description: "Create sub-flocks" 
    },
    { 
      id: "venue", 
      label: "Change Venue", 
      icon: Navigation, 
      description: "Move to a new location" 
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="truncate">{item.name || item.title}</span>
            <Badge variant="default" className="bg-green-500">Command Center</Badge>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </CardTitle>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{members.length} active members</span>
          </div>
          {item.ends_at && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{getTimeRemaining(item.ends_at)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="constellation">Map</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="constellation" className="space-y-4">
            {/* Constellation view showing member relationships */}
            <div className="bg-muted/20 rounded-lg p-4">
              <div className="text-sm font-medium mb-3">Flock Constellation</div>
              <ConstellationMap 
                members={memberAvatars}
                currentUserId={currentUserId}
                size={200}
                className="mx-auto"
              />
            </div>
            
            {/* Quick coordination actions */}
            <div className="grid grid-cols-2 gap-2">
              {coordinationActions.slice(0, 4).map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="h-auto p-3 justify-start"
                    onClick={() => onAction?.(action.id)}
                  >
                    <Icon className="w-4 h-4 mr-2 shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs opacity-70">{action.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="members" className="space-y-4">
            <MemberStatusDashboard 
              members={members}
              floqId={item.id}
              onMemberAction={(memberId, action) => 
                onAction?.("member_action", { memberId, action })
              }
            />
          </TabsContent>
          
          <TabsContent value="decisions" className="space-y-4">
            <DecisionVotingSystem 
              floqId={item.id}
              members={members}
              onVote={(decisionId, choice) => 
                onAction?.("vote", { decisionId, choice })
              }
            />
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Flock management actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Flock Management</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction?.("extend")}>
              <Clock className="w-3 h-3 mr-1" />
              Extend TTL
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction?.("split")}>
              <Shuffle className="w-3 h-3 mr-1" />
              Split Group
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction?.("venue")}>
              <Navigation className="w-3 h-3 mr-1" />
              Change Venue
            </Button>
          </div>
        </div>

        {/* Real-time status indicator */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-green-700 dark:text-green-300">
              Flock is active and coordinated
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Live</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeRemaining(endsAt: string): string {
  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const diffMs = end - now;
  
  if (diffMs <= 0) return "Ending soon";
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m left`;
  
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${diffHours}h ${remainingMins}m left`;
}