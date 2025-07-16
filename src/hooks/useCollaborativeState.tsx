import { useState, useCallback, useEffect, useRef } from 'react';
import { useAutoSaveDrafts } from './useAutoSaveDrafts';

export interface PlanStop {
  id: string;
  title: string;
  venue: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  vibeMatch: number;
  participants: string[];
  status: 'confirmed' | 'suggested' | 'voted';
  votes: { userId: string; vote: 'yes' | 'no' | 'maybe' }[];
  createdBy: string;
  color: string;
}

export interface PlanParticipant {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline';
  isEditing: boolean;
  currentSelection?: string;
  lastActivity: number;
  role: 'organizer' | 'participant';
}

export interface CollaborativePlan {
  id: string;
  title: string;
  date: string;
  organizer: string;
  participants: PlanParticipant[];
  stops: PlanStop[];
  status: 'planning' | 'confirmed' | 'executing' | 'completed';
  version: number;
  lastUpdated: number;
}

export interface PlanActivity {
  id: string;
  type: 'add' | 'remove' | 'edit' | 'vote' | 'join' | 'leave';
  userId: string;
  stopId?: string;
  timestamp: number;
  description: string;
}

export const useCollaborativeState = (planId: string) => {
  const { autoSave, loadDraft, clearDraft, isAutoSaving } = useAutoSaveDrafts({ planId })
  
  const [plan, setPlan] = useState<CollaborativePlan>({
    id: planId,
    title: "Tonight's Adventure",
    date: new Date().toISOString().split('T')[0],
    organizer: "you",
    participants: [
      {
        id: "you",
        name: "You",
        avatar: "/placeholder.svg", 
        status: "online",
        isEditing: false,
        lastActivity: Date.now(),
        role: "organizer"
      },
      {
        id: "alex",
        name: "Alex", 
        avatar: "/placeholder.svg",
        status: "online",
        isEditing: true,
        currentSelection: "venue-search",
        lastActivity: Date.now() - 30000,
        role: "participant"
      },
      {
        id: "sam", 
        name: "Sam",
        avatar: "/placeholder.svg",
        status: "idle",
        isEditing: false,
        lastActivity: Date.now() - 120000,
        role: "participant"
      }
    ],
    stops: [
      {
        id: "stop-1",
        title: "Dinner at Bestia",
        venue: "Bestia",
        description: "Italian spot in Arts District",
        startTime: "19:00",
        endTime: "21:00", 
        location: "Arts District",
        vibeMatch: 88,
        participants: ["you", "alex"],
        status: "confirmed",
        votes: [
          { userId: "you", vote: "yes" },
          { userId: "alex", vote: "yes" },
          { userId: "sam", vote: "maybe" }
        ],
        createdBy: "you",
        color: "hsl(200 70% 60%)"
      },
      {
        id: "stop-2",
        title: "Cocktails at EP & LP", 
        venue: "EP & LP",
        description: "Rooftop bar with city views",
        startTime: "21:30",
        endTime: "23:30",
        location: "West Hollywood",
        vibeMatch: 92,
        participants: ["you", "alex", "sam"],
        status: "voted",
        votes: [
          { userId: "you", vote: "yes" },
          { userId: "alex", vote: "yes" },
          { userId: "sam", vote: "yes" }
        ],
        createdBy: "alex",
        color: "hsl(280 70% 60%)"
      }
    ],
    status: "planning",
    version: 1,
    lastUpdated: Date.now()
  });

  const [activities, setActivities] = useState<PlanActivity[]>([
    {
      id: "activity-1",
      type: "add",
      userId: "alex",
      stopId: "stop-2", 
      timestamp: Date.now() - 300000,
      description: "Alex added EP & LP for cocktails"
    },
    {
      id: "activity-2",
      type: "vote",
      userId: "sam",
      stopId: "stop-2",
      timestamp: Date.now() - 180000,
      description: "Sam voted yes on EP & LP"
    }
  ]);

  const [draggedStop, setDraggedStop] = useState<PlanStop | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout>();

  // Mock real-time sync
  const syncChanges = useCallback(() => {
    setPlan(prev => ({
      ...prev,
      version: prev.version + 1,
      lastUpdated: Date.now()
    }));
  }, []);

  const addStop = useCallback((stop: Omit<PlanStop, 'id' | 'createdBy' | 'participants' | 'votes'>) => {
    const newStop: PlanStop = {
      ...stop,
      id: `stop-${Date.now()}`,
      createdBy: "you",
      participants: ["you"],
      votes: [{ userId: "you", vote: "yes" }]
    };

    setPlan(prev => {
      const updated = {
        ...prev,
        stops: [...prev.stops, newStop]
      };
      
      // Auto-save draft
      autoSave(updated.stops);
      
      return updated;
    });

    setActivities(prev => [...prev, {
      id: `activity-${Date.now()}`,
      type: "add",
      userId: "you",
      stopId: newStop.id,
      timestamp: Date.now(),
      description: `You added ${newStop.title}`
    }]);

    syncChanges();
  }, [syncChanges, autoSave]);

  const removeStop = useCallback((stopId: string) => {
    const stop = plan.stops.find(s => s.id === stopId);
    if (!stop) return;

    setPlan(prev => {
      const updated = {
        ...prev,
        stops: prev.stops.filter(s => s.id !== stopId)
      };
      
      // Auto-save draft
      autoSave(updated.stops);
      
      return updated;
    });

    setActivities(prev => [...prev, {
      id: `activity-${Date.now()}`,
      type: "remove",
      userId: "you", 
      stopId,
      timestamp: Date.now(),
      description: `You removed ${stop.title}`
    }]);

    syncChanges();
  }, [plan.stops, syncChanges, autoSave]);

  const reorderStops = useCallback((newOrder: PlanStop[]) => {
    setPlan(prev => {
      const updated = {
        ...prev,
        stops: newOrder
      };
      
      // Auto-save draft
      autoSave(updated.stops);
      
      return updated;
    });

    syncChanges();
  }, [syncChanges, autoSave]);

  const voteOnStop = useCallback((stopId: string, vote: 'yes' | 'no' | 'maybe') => {
    setPlan(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId
          ? {
              ...stop,
              votes: [
                ...stop.votes.filter(v => v.userId !== "you"),
                { userId: "you", vote }
              ]
            }
          : stop
      )
    }));

    setActivities(prev => [...prev, {
      id: `activity-${Date.now()}`,
      type: "vote",
      userId: "you",
      stopId,
      timestamp: Date.now(),
      description: `You voted ${vote} on this stop`
    }]);

    syncChanges();
  }, [syncChanges]);

  const updateParticipantStatus = useCallback((userId: string, updates: Partial<PlanParticipant>) => {
    setPlan(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === userId ? { ...p, ...updates, lastActivity: Date.now() } : p
      )
    }));
  }, []);

  // Mock real-time updates from other users
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate Alex editing
      if (Math.random() > 0.7) {
        updateParticipantStatus("alex", {
          isEditing: Math.random() > 0.5,
          currentSelection: Math.random() > 0.5 ? "timeline-editor" : "venue-search"
        });
      }

      // Simulate Sam activity
      if (Math.random() > 0.9) {
        updateParticipantStatus("sam", {
          status: Math.random() > 0.3 ? "online" : "idle"
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [updateParticipantStatus]);

  // Load draft on mount
  useEffect(() => {
    const loadInitialDraft = async () => {
      const draft = await loadDraft();
      if (draft && draft.stops.length > 0) {
        setPlan(prev => ({
          ...prev,
          stops: draft.stops,
          version: draft.metadata.version
        }));
      }
    };
    
    loadInitialDraft();
  }, [loadDraft]);

  return {
    plan,
    activities,
    draggedStop,
    setDraggedStop,
    addStop,
    removeStop,
    reorderStops,
    voteOnStop,
    updateParticipantStatus,
    isAutoSaving,
    clearDraft
  };
};