import { useState, useEffect } from "react";
import { CheckInStatusBadge } from "./CheckInStatusBadge";

interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline';
  isEditing: boolean;
  currentSelection?: string;
  lastActivity: number;
  role: 'organizer' | 'participant';
  checkInStatus?: 'checked-in' | 'nearby' | 'away' | 'offline';
}

interface LiveParticipantTrackerProps {
  participants: Participant[];
  onParticipantUpdate?: (userId: string, updates: Partial<Participant>) => void;
}

export const LiveParticipantTracker = ({ participants, onParticipantUpdate }: LiveParticipantTrackerProps) => {
  const [cursors, setCursors] = useState<{ [userId: string]: { x: number; y: number } }>({});

  // Mock cursor tracking
  useEffect(() => {
    const interval = setInterval(() => {
      participants.forEach(participant => {
        if (participant.isEditing && participant.id !== "you") {
          setCursors(prev => ({
            ...prev,
            [participant.id]: {
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }
          }));
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [participants]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'hsl(120 70% 60%)';
      case 'idle': return 'hsl(60 70% 60%)';
      case 'offline': return 'hsl(0 0% 50%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  const getActivityText = (participant: Participant) => {
    if (participant.isEditing) {
      switch (participant.currentSelection) {
        case 'timeline-editor': return 'editing timeline';
        case 'venue-search': return 'browsing venues';
        case 'chat': return 'in chat';
        default: return 'planning';
      }
    }
    return participant.status;
  };

  return (
    <>
      {/* Participant Status Bar */}
      <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Active Planners</h3>
          <div className="text-xs text-muted-foreground">
            {participants.filter(p => p.status === 'online').length} online
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {participants.map((participant) => (
            <div key={participant.id} className="relative">
              <div className="relative">
                <div 
                  className="w-10 h-10 rounded-full border-2 transition-all duration-300"
                  style={{
                    borderColor: getStatusColor(participant.status),
                    boxShadow: participant.isEditing ? `0 0 12px ${getStatusColor(participant.status)}40` : 'none'
                  }}
                >
                  <img 
                    src={participant.avatar} 
                    alt={participant.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                
                {/* Status indicator */}
                <div 
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
                  style={{ backgroundColor: getStatusColor(participant.status) }}
                />
                
                {/* Organizer crown */}
                {participant.role === 'organizer' && (
                  <div className="absolute -top-1 -right-1 text-xs">👑</div>
                )}
              </div>
              
              {/* Check-in Status Badge */}
              {participant.checkInStatus && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <CheckInStatusBadge status={participant.checkInStatus} />
                </div>
              )}
              
              {/* Typing indicator */}
              {participant.isEditing && !participant.checkInStatus && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium animate-pulse-glow">
                    {getActivityText(participant)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Live activity feed */}
        <div className="mt-4 space-y-1">
          {participants
            .filter(p => p.isEditing)
            .map(participant => (
              <div key={participant.id} className="text-xs text-muted-foreground flex items-center space-x-2">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: getStatusColor(participant.status) }}
                />
                <span>{participant.name} is {getActivityText(participant)}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Live cursors for other users */}
      {Object.entries(cursors).map(([userId, position]) => {
        const participant = participants.find(p => p.id === userId);
        if (!participant || !participant.isEditing) return null;

        return (
          <div
            key={userId}
            className="fixed pointer-events-none z-50 transition-all duration-500"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <div 
                className="w-6 h-6 rounded-full border-2 border-background animate-pulse-glow"
                style={{ backgroundColor: getStatusColor(participant.status) }}
              />
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="bg-foreground text-background px-2 py-1 rounded-lg text-xs font-medium">
                  {participant.name}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};