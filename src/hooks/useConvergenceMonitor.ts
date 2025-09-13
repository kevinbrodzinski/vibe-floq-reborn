import { useEffect, useRef } from 'react';
import { eventBridge, Events } from '@/services/eventBridge';
import { socialCache } from '@/lib/social/socialCache';
import { bestPairConvergence, groupConvergences, Agent } from '@/lib/convergence/multiAgent';

type Suppression = { id: string; until: number };

export function useConvergenceMonitor(pollMs = 4000) {
  const suppressed = useRef<Suppression[]>([]);

  useEffect(() => {
    const now = Date.now();
    suppressed.current = suppressed.current.filter(s => s.until > now);
  }, []);

  useEffect(() => {
    const friendHeads = socialCache.getFriendHeads();
    const myPath = socialCache.getMyPath();
    
    if (!friendHeads?.length || myPath.length < 1) return;
    
    const mePoint = myPath[myPath.length-1];
    const meAgent: Agent = {
      id: 'me',
      lng: mePoint.lng,
      lat: mePoint.lat,
      vx: 0, vy: 0, conf: 0.9
    };

    const agents: Agent[] = friendHeads.map((f) => ({
      id: f.t_head,
      lng: f.lng, 
      lat: f.lat,
      vx: 0, // TODO: Extract velocity from friend heads when available
      vy: 0,
      conf: 0.5
    }));

    // compute pairs "me" with moving friends first
    const pairEvents = agents
      .map(a => bestPairConvergence(meAgent, a))
      .filter(Boolean);

    // compute simple groups (me + others)
    const groups = groupConvergences([meAgent, ...agents]);

    const all = [...pairEvents, ...groups]
      .filter(e => e.timeToMeet <= 180 && e.probability >= 0.7)
      .sort((a,b) => (b.probability - a.probability) || (a.timeToMeet - b.timeToMeet));

    if (!all.length) return;
    const top = all[0];

    // suppression: don't spam same id for 30s
    const hit = suppressed.current.find(s => s.id === top.id && s.until > Date.now());
    if (hit) return;
    suppressed.current.push({ id: top.id, until: Date.now() + 30000 });

    // notify UI via EventBridge
    eventBridge.emit(Events.FLOQ_CONVERGENCE_DETECTED, {
      friendId: top.type === 'pair' ? top.participants.find((x:string)=>x!=='me') || 'friend'
                                    : 'group',
      friendName: top.type === 'pair' ? 'Friend' : 'Friends',
      probability: top.probability,
      timeToMeet: top.timeToMeet,
      predictedLocation: { ...top.meetingPoint },
      confidence: top.confidence,
    });

    const interval = setInterval(() => {
      // Recheck convergence every pollMs
    }, pollMs);

    return () => clearInterval(interval);
  }, [pollMs]);
}