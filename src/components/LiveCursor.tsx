import { useEffect, useState } from "react";
import type { TimerId } from '@/types/Timer';
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

interface CollaboratorCursor {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  position: CursorPosition;
  color: string;
}

interface LiveCursorProps {
  planId: string;
  enabled?: boolean;
  className?: string;
}

const CURSOR_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
];

export const LiveCursor = ({
  planId,
  enabled = true,
  className = ""
}: LiveCursorProps) => {
  const [collaborators, setCollaborators] = useState<CollaboratorCursor[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !planId) return;

    let channel: any;
    let trackingInterval: TimerId;

    const initializeTracking = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setMyUserId(user.id);

      // Create realtime channel for cursor tracking
      channel = supabase
        .channel(`plan-cursors-${planId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const cursors: CollaboratorCursor[] = [];
          
          Object.entries(state).forEach(([userId, presences]: [string, any[]]) => {
            if (userId !== user.id && presences.length > 0) {
              const presence = presences[0];
              cursors.push({
                userId,
                username: presence.username || 'Anonymous',
                displayName: presence.displayName || presence.username || 'Anonymous',
                avatarUrl: presence.avatarUrl,
                position: presence.position,
                color: CURSOR_COLORS[cursors.length % CURSOR_COLORS.length]
              });
            }
          });
          
          setCollaborators(cursors);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined cursor tracking:', key);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('User left cursor tracking:', key);
          setCollaborators(prev => prev.filter(c => c.userId !== key));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Get user profile info
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url')
              .eq('id', user.id)
              .single();

            // Start tracking mouse position
            const handleMouseMove = (e: MouseEvent) => {
              const position: CursorPosition = {
                x: e.clientX,
                y: e.clientY,
                elementId: (e.target as Element)?.id || undefined,
                timestamp: Date.now()
              };

              // Throttle updates to avoid spam
              if (trackingInterval) clearTimeout(trackingInterval);
              trackingInterval = setTimeout(() => {
                channel.track({
                  userId: user.id,
                  username: profile?.username || 'Anonymous',
                  displayName: profile?.display_name || profile?.username || 'Anonymous',
                  avatarUrl: profile?.avatar_url,
                  position
                });
              }, 100);
            };

            document.addEventListener('mousemove', handleMouseMove);
            
            // Cleanup on unmount
            return () => {
              document.removeEventListener('mousemove', handleMouseMove);
              if (trackingInterval) clearTimeout(trackingInterval);
            };
          }
        });
    };

    initializeTracking();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (trackingInterval) {
        clearTimeout(trackingInterval);
      }
    };
  }, [planId, enabled]);

  if (!enabled || collaborators.length === 0) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      {collaborators.map((collaborator) => {
        const isRecentlyActive = Date.now() - collaborator.position.timestamp < 5000;
        
        if (!isRecentlyActive) return null;

        return (
          <div
            key={collaborator.userId}
            className="absolute transition-all duration-100 ease-out pointer-events-none"
            style={{
              left: collaborator.position.x,
              top: collaborator.position.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="drop-shadow-sm"
            >
              <path
                d="M2 2L18 8L8 12L2 2Z"
                fill={collaborator.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            
            {/* User info bubble */}
            <div 
              className="
                ml-2 mt-1 px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg
                animate-in fade-in-0 slide-in-from-left-2 duration-200
                max-w-32 truncate
              "
              style={{ backgroundColor: collaborator.color }}
            >
              <div className="flex items-center gap-1">
                <Avatar className="w-3 h-3">
                  <AvatarImage src={collaborator.avatarUrl} />
                  <AvatarFallback className="text-[8px]">
                    {collaborator.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {collaborator.displayName}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};