import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MoreVertical, 
  MapPin, 
  Clock, 
  MessageCircle, 
  UserCheck, 
  UserX,
  Navigation,
  Battery
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MemberStatus {
  profile_id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    username: string | null;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface MemberStatusDashboardProps {
  members: MemberStatus[];
  floqId: string;
  onMemberAction?: (memberId: string, action: string) => void;
}

export function MemberStatusDashboard({ 
  members, 
  floqId, 
  onMemberAction 
}: MemberStatusDashboardProps) {
  
  // Mock member activity data - in real app this would come from API/websocket
  const getMemberActivity = (memberId: string) => {
    const activities = [
      { status: "active", lastSeen: "2m ago", location: "moving", energy: 0.8 },
      { status: "idle", lastSeen: "15m ago", location: "venue", energy: 0.4 },
      { status: "away", lastSeen: "45m ago", location: "unknown", energy: 0.1 },
    ];
    return activities[Math.floor(Math.random() * activities.length)];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "away": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case "moving": return Navigation;
      case "venue": return MapPin;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Member Status</div>
        <Badge variant="outline" className="text-xs">
          {members.filter(m => getMemberActivity(m.profile_id).status === "active").length} active
        </Badge>
      </div>

      <ScrollArea className="h-[300px] w-full">
        <div className="space-y-2">
          {members.map(member => {
            const activity = getMemberActivity(member.profile_id);
            const LocationIcon = getLocationIcon(activity.location);
            const displayName = member.profiles?.display_name || 
                              member.profiles?.username || 
                              "Unknown Member";
            
            return (
              <div
                key={member.profile_id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Avatar with status indicator */}
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                      getStatusColor(activity.status)
                    )}
                  />
                </div>

                {/* Member info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{displayName}</span>
                    {member.role !== "member" && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <LocationIcon className="w-3 h-3" />
                      <span>{activity.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{activity.lastSeen}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Battery className="w-3 h-3" />
                      <span>{Math.round(activity.energy * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <Badge 
                  variant={activity.status === "active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {activity.status}
                </Badge>

                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onMemberAction?.(member.profile_id, "message")}>
                      <MessageCircle className="w-3 h-3 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMemberAction?.(member.profile_id, "locate")}>
                      <MapPin className="w-3 h-3 mr-2" />
                      View Location
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {member.role === "member" && (
                      <DropdownMenuItem onClick={() => onMemberAction?.(member.profile_id, "promote")}>
                        <UserCheck className="w-3 h-3 mr-2" />
                        Make Co-Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onMemberAction?.(member.profile_id, "remove")}
                    >
                      <UserX className="w-3 h-3 mr-2" />
                      Remove from Flock
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="font-medium text-green-600">
            {members.filter(m => getMemberActivity(m.profile_id).status === "active").length}
          </div>
          <div className="text-muted-foreground">Active</div>
        </div>
        <div>
          <div className="font-medium text-yellow-600">
            {members.filter(m => getMemberActivity(m.profile_id).status === "idle").length}
          </div>
          <div className="text-muted-foreground">Idle</div>
        </div>
        <div>
          <div className="font-medium text-gray-600">
            {members.filter(m => getMemberActivity(m.profile_id).status === "away").length}
          </div>
          <div className="text-muted-foreground">Away</div>
        </div>
      </div>
    </div>
  );
}