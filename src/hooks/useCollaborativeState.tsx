import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';
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
  votes: { profileId: string; vote: 'yes' | 'no' | 'maybe' }[];
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
  profileId: string;
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
          { profileId: "you", vote: "yes" },
          { profileId: "alex", vote: "yes" },
          { profileId: "sam", vote: "maybe" }
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
          { profileId: "you", vote: "yes" },
          { profileId: "alex", vote: "yes" },
          { profileId: "sam", vote: "yes" }
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
      profileId: "alex",
      stopId: "stop-2", 
      timestamp: Date.now() - 300000,
      description: "Alex added EP & LP for cocktails"
    },
    {
      id: "activity-2",
      type: "vote",
      profileId: "sam",
      stopId: "stop-2",
      timestamp: Date.now() - 180000,
      description: "Sam voted yes on EP & LP"
    }
  ]);

  // Recent votes for real-time overlays
  const [recentVotes, setRecentVotes] = useState<any[]>([]);

  const [draggedStop, setDraggedStop] = useState<PlanStop | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout>();

  // Debounced sync to prevent spam from drag operations
  const debouncedSync = useRef(
    debounce(() => {
      setPlan(prev => ({
        ...prev,
        version: prev.version + 1,
        lastUpdated: Date.now()
      }));
    }, 300)
  ).current;

  const addStop = useCallback((stop: Omit<PlanStop, 'id' | 'createdBy' | 'participants' | 'votes'>) => {
    const newStop: PlanStop = {
      ...stop,
      id: uuidv4(), // Use UUID instead of Date.now()
      createdBy: "you",
      participants: ["you"],
      votes: [{ profileId: "you", vote: "yes" }]
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
      profileId: "you",
      stopId: newStop.id,
      timestamp: Date.now(),
      description: `You added ${newStop.title}`
    }]);

    debouncedSync();
  }, [debouncedSync, autoSave]);

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
      profileId: "you", 
      stopId,
      timestamp: Date.now(),
      description: `You removed ${stop.title}`
    }]);

    debouncedSync();
  }, [plan.stops, debouncedSync, autoSave]);

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

    debouncedSync();
  }, [debouncedSync, autoSave]);

  const voteOnStop = useCallback((stopId: string, vote: 'yes' | 'no' | 'maybe') => {
    setPlan(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId
          ? {
              ...stop,
              votes: [
                ...stop.votes.filter(v => v.profileId !== "you"),
                { profileId: "you", vote }
              ]
            }
          : stop
      )
    }));

    setActivities(prev => [...prev, {
      id: `activity-${Date.now()}`,
      type: "vote",
      profileId: "you",
      stopId,
      timestamp: Date.now(),
      description: `You voted ${vote} on this stop`
    }]);

    debouncedSync();
  }, [debouncedSync]);

  const updateParticipantStatus = useCallback((profileId: string, updates: Partial<PlanParticipant>) => {
    setPlan(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === profileId ? { ...p, ...updates, lastActivity: Date.now() } : p
      )
    }));
  }, []);

  // Mock real-time updates from other users including vote broadcasts
  useEffect(() => {
    // Mock socket channel for vote events
    const mockVoteChannel = {
      on: (event: string, callback: (payload: any) => void) => {
        // Simulate receiving vote events
        const interval = setInterval(() => {
          if (Math.random() > 0.95) { // Occasional votes
            const voteActivity = {
              id: `vote-${Date.now()}`,
              type: 'vote_cast',
              timestamp: new Date().toISOString(),
              stopId: plan.stops[Math.floor(Math.random() * plan.stops.length)]?.id || '',
              profileId: Math.random() > 0.5 ? 'alex' : 'sam',
              username: Math.random() > 0.5 ? 'Alex' : 'Sam',
              vote: Math.random() > 0.5 ? 'up' : 'down'
            }
            callback(voteActivity)
          }
        }, 2000)
        
        return () => clearInterval(interval)
      }
    }

    const unsubscribe = mockVoteChannel.on('vote', (payload: any) => {
      setActivities(a => [...a, payload])
      setRecentVotes([payload])        // <— bump to trigger tracker
    })

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

    return () => {
      clearInterval(interval);
      unsubscribe?.();
    };
  }, [updateParticipantStatus, plan.stops]);

  // Clear recent votes after a tick so we don't keep re-sending
  useEffect(() => {
    if (recentVotes.length) {
      const timer = setTimeout(() => setRecentVotes([]), 100)
      return () => clearTimeout(timer)
    }
  }, [recentVotes]);

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
    clearDraft,
    recentVotes
  };
};