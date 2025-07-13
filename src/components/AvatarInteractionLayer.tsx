import { useState, useCallback, useRef } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { MessageCircle, Users, Heart, Zap, Coffee, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
}

interface AvatarInteraction {
  type: 'dm' | 'invite' | 'vibe-check' | 'connect' | 'meetup' | 'group-floq';
  sourceId: string;
  targetId?: string;
  targetIds?: string[];
  position?: { x: number; y: number };
}

interface AvatarInteractionLayerProps {
  people: Person[];
  onInteraction?: (interaction: AvatarInteraction) => void;
  onPersonUpdate?: (personId: string, updates: Partial<Person>) => void;
}

export const AvatarInteractionLayer = ({ 
  people, 
  onInteraction,
  onPersonUpdate 
}: AvatarInteractionLayerProps) => {
  const [selectedAvatars, setSelectedAvatars] = useState<string[]>([]);
  const [draggedAvatar, setDraggedAvatar] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    personId: string;
    x: number;
    y: number;
  } | null>(null);
  const [connectionLines, setConnectionLines] = useState<Array<{
    from: string;
    to: string;
    strength: number;
    type: 'friendship' | 'recent' | 'compatible';
  }>>([]);
  
  const { socialHaptics } = useHapticFeedback();
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Mock connection data
  const getConnectionStrength = useCallback((id1: string, id2: string): number => {
    // Mock algorithm based on IDs
    const hash = (id1 + id2).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash % 100) / 100;
  }, []);

  const handleAvatarTouchStart = useCallback((personId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setDraggedAvatar(personId);
    socialHaptics.avatarInteraction();
  }, [socialHaptics]);

  const handleAvatarTouchEnd = useCallback((personId: string, e: React.TouchEvent) => {
    if (!dragStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;
    const duration = Date.now() - dragStartRef.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Long press detection
    if (duration > 500 && distance < 20) {
      setContextMenu({
        visible: true,
        personId,
        x: touch.clientX,
        y: touch.clientY
      });
      socialHaptics.longPressActivated();
      return;
    }

    // Drag to another avatar detection
    if (distance > 50) {
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetPersonId = targetElement?.getAttribute('data-person-id');
      
      if (targetPersonId && targetPersonId !== personId) {
        onInteraction?.({
          type: 'meetup',
          sourceId: personId,
          targetId: targetPersonId,
          position: { x: touch.clientX, y: touch.clientY }
        });
        socialHaptics.connectionMade();
        
        // Show connection line temporarily
        const newConnection = {
          from: personId,
          to: targetPersonId,
          strength: getConnectionStrength(personId, targetPersonId),
          type: 'recent' as const
        };
        setConnectionLines(prev => [...prev, newConnection]);
        setTimeout(() => {
          setConnectionLines(prev => prev.filter(conn => 
            !(conn.from === personId && conn.to === targetPersonId)
          ));
        }, 3000);
      }
    }

    setDraggedAvatar(null);
    dragStartRef.current = null;
  }, [onInteraction, socialHaptics, getConnectionStrength]);

  const handleMultiSelect = useCallback((personId: string) => {
    setSelectedAvatars(prev => {
      const newSelection = prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId];
      
      if (newSelection.length >= 3) {
        // Trigger group floq creation
        onInteraction?.({
          type: 'group-floq',
          sourceId: newSelection[0],
          targetIds: newSelection.slice(1)
        });
        socialHaptics.floqJoined();
        return [];
      }
      
      return newSelection;
    });
  }, [onInteraction, socialHaptics]);

  const handleContextAction = useCallback((action: string, personId: string) => {
    const actionMap = {
      dm: 'dm',
      invite: 'invite', 
      vibe: 'vibe-check',
      connect: 'connect'
    } as const;

    if (actionMap[action as keyof typeof actionMap]) {
      onInteraction?.({
        type: actionMap[action as keyof typeof actionMap],
        sourceId: personId
      });
      socialHaptics.gestureConfirm();
    }

    setContextMenu(null);
  }, [onInteraction, socialHaptics]);

  const getVibeIcon = (vibe: string) => {
    switch (vibe) {
      case 'social': return Users;
      case 'chill': return Coffee;
      case 'flowing': return Zap;
      case 'open': return Heart;
      default: return Star;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connectionLines.map((connection, index) => {
          const fromPerson = people.find(p => p.id === connection.from);
          const toPerson = people.find(p => p.id === connection.to);
          
          if (!fromPerson || !toPerson) return null;
          
          const fromX = (fromPerson.x / 100) * window.innerWidth;
          const fromY = (fromPerson.y / 100) * window.innerHeight;
          const toX = (toPerson.x / 100) * window.innerWidth;
          const toY = (toPerson.y / 100) * window.innerHeight;

          return (
            <line
              key={`${connection.from}-${connection.to}-${index}`}
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={`hsl(var(--primary))`}
              strokeWidth={connection.strength * 4}
              strokeOpacity={0.6}
              className="animate-fade-in"
              strokeDasharray="5,5"
            />
          );
        })}
      </svg>

      {/* Avatar Interaction Zones */}
      {people.map((person) => {
        const VibeIcon = getVibeIcon(person.vibe);
        const isSelected = selectedAvatars.includes(person.id);
        const isDragged = draggedAvatar === person.id;

        return (
          <div
            key={person.id}
            data-person-id={person.id}
            className={`absolute transition-all duration-300 cursor-pointer pointer-events-auto
              ${isDragged ? 'scale-110 z-10' : ''}
              ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
            `}
            style={{
              left: `${person.x}%`,
              top: `${person.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onTouchStart={(e) => handleAvatarTouchStart(person.id, e)}
            onTouchEnd={(e) => handleAvatarTouchEnd(person.id, e)}
            onClick={() => handleMultiSelect(person.id)}
          >
            {/* Avatar with enhanced interaction area */}
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center
                  ${isDragged ? 'glow-active' : 'hover:glow-secondary'}
                  transition-all duration-200`}
                style={{
                  backgroundColor: person.color,
                  boxShadow: `0 0 20px ${person.color}40`,
                }}
              >
                <VibeIcon className="w-4 h-4 text-white" />
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -inset-1 rounded-full border-2 border-primary animate-pulse" />
              )}
              
              {/* Interaction ripple effect */}
              {isDragged && (
                <div className="absolute inset-0 rounded-full border border-primary/50 animate-ping" />
              )}
            </div>

            {/* Name label */}
            <div className="text-xs text-center mt-2 text-foreground/90 font-medium">
              {person.name}
            </div>
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu?.visible && (
        <div
          className="fixed z-50 bg-card/95 backdrop-blur-xl rounded-2xl border border-border p-2 animate-scale-in"
          style={{
            left: contextMenu.x - 80,
            top: contextMenu.y - 100,
          }}
        >
          <div className="flex flex-col space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handleContextAction('dm', contextMenu.personId)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handleContextAction('invite', contextMenu.personId)}
            >
              <Users className="w-4 h-4 mr-2" />
              Invite
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handleContextAction('vibe', contextMenu.personId)}
            >
              <Zap className="w-4 h-4 mr-2" />
              Vibe Check
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handleContextAction('connect', contextMenu.personId)}
            >
              <Heart className="w-4 h-4 mr-2" />
              Connect
            </Button>
          </div>
        </div>
      )}

      {/* Multi-select indicator */}
      {selectedAvatars.length > 0 && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-[35]">
          <div className="bg-primary/90 backdrop-blur-xl rounded-full px-4 py-2 text-primary-foreground text-sm font-medium animate-fade-in">
            {selectedAvatars.length} selected • Tap one more for group floq
          </div>
        </div>
      )}

      {/* Tap to close context menu */}
      {contextMenu?.visible && (
        <div
          className="fixed inset-0 z-[35]"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};