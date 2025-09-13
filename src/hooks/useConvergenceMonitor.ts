import { useEffect, useRef } from 'react';
import { emitEvent, Events } from '@/services/eventBridge';
import { useSocialCache } from '@/hooks/useSocialCache';
import { bestPairConvergence, groupConvergences, Agent } from '@/lib/convergence/multiAgent';

type Suppression = { id: string; until: number };

export function useConvergenceMonitor(pollMs = 4000) {
  const suppressed = useRef<Suppression[]>([]);
  const { friendHeads: enhancedFriends, myPath } = useSocialCache();

  // Utilities for m/s <-> deg projection
  const METERS_PER_DEG_LAT = 110540;
  const metersPerDegLng = (lat: number) => 111320 * Math.cos(lat * Math.PI / 180);
  const computeSelfVelocity = (path: Array<{lng:number;lat:number;t?:number}>) => {
    if (!path || path.length < 2) return { vx: 0, vy: 0, speed: 0, conf: 0.6 };
    const a = path[path.length - 2], b = path[path.length - 1];
    const dt = ((b.t ?? Date.now()) - (a.t ?? Date.now())) / 1000;
    if (dt <= 0) return { vx: 0, vy: 0, speed: 0, conf: 0.6 };
    const mLng = metersPerDegLng((a.lat + b.lat) / 2);
    const dx = (b.lng - a.lng) * mLng;           // meters east
    const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT; // meters north
    const vx = dx / dt, vy = dy / dt;
    const speed = Math.hypot(vx, vy);
    // confidence: moderate base + stronger if movement looks "real"
    const conf = Math.max(0.5, Math.min(0.9, 0.5 + (speed / 10)));
    return { vx, vy, speed, conf };
  };

  useEffect(() => {
    const now = Date.now();
    suppressed.current = suppressed.current.filter(s => s.until > now);
  }, []);

  useEffect(() => {
    const friendHeads = enhancedFriends; // already enhanced (m/s velocities)
    const path = myPath;

    if (!friendHeads?.length || path.length < 1) return;

    const mePoint = path[path.length - 1];
    const self = computeSelfVelocity(path);
    const meAgent: Agent = {
      id: 'me',
      lng: mePoint.lng,
      lat: mePoint.lat,
      vx: self.vx,
      vy: self.vy,
      conf: self.conf
    };

    const agents: Agent[] = friendHeads
      .filter(f => f.velocity && Number.isFinite(f.velocity.velocity?.[0]) && Number.isFinite(f.velocity.velocity?.[1]))
      .map((f) => ({
        id: f.id || f.profile_id || f.t_head,
        lng: f.lng,
        lat: f.lat,
        vx: f.velocity!.velocity[0], // m/s east
        vy: f.velocity!.velocity[1], // m/s north
        conf: f.velocity!.confidence ?? 0.6,
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
    emitEvent(Events.FLOQ_CONVERGENCE_DETECTED, {
      friendId: top.type === 'pair' ? top.participants.find((x:string)=>x!=='me') || 'friend'
                                    : 'group',
      friendName: top.type === 'pair' ? 'Friend' : 'Friends',
      probability: top.probability,
      timeToMeet: top.timeToMeet,
      predictedLocation: { ...top.meetingPoint },
      confidence: top.confidence,
    });

    // Set up polling for convergence detection
    const interval = setInterval(() => {
      // Re-run convergence calculations
      const friendHeads = enhancedFriends;
      const path = myPath;
      if (!friendHeads?.length || path.length < 1) return;
      const mePoint = path[path.length - 1];
      const self = computeSelfVelocity(path);
      const meAgent: Agent = {
        id: 'me',
        lng: mePoint.lng,
        lat: mePoint.lat,
        vx: self.vx,
        vy: self.vy,
        conf: self.conf
      };

      const agents: Agent[] = friendHeads
        .filter(f => f.velocity && Number.isFinite(f.velocity.velocity?.[0]) && Number.isFinite(f.velocity.velocity?.[1]))
        .map(f => ({
          id: f.id || f.profile_id || f.t_head,
          lng: f.lng, lat: f.lat,
          vx: f.velocity!.velocity[0], vy: f.velocity!.velocity[1],
          conf: f.velocity!.confidence ?? 0.6,
        }));

      const pairEvents = agents
        .map(a => bestPairConvergence(meAgent, a))
        .filter(Boolean);

      const groups = groupConvergences([meAgent, ...agents]);

      const all = [...pairEvents, ...groups]
        .filter(e => e.timeToMeet <= 180 && e.probability >= 0.7)
        .sort((a,b) => (b.probability - a.probability) || (a.timeToMeet - b.timeToMeet));

      if (!all.length) return;
      const top = all[0];

      const hit = suppressed.current.find(s => s.id === top.id && s.until > Date.now());
      if (hit) return;
      suppressed.current.push({ id: top.id, until: Date.now() + 30000 });

      emitEvent(Events.FLOQ_CONVERGENCE_DETECTED, {
        friendId: top.type === 'pair' ? top.participants.find((x:string)=>x!=='me') || 'friend'
                                      : 'group',
        friendName: top.type === 'pair' ? 'Friend' : 'Friends',
        probability: top.probability,
        timeToMeet: top.timeToMeet,
        predictedLocation: { ...top.meetingPoint },
        confidence: top.confidence,
      });
    }, pollMs);

    return () => clearInterval(interval);
  }, [pollMs]);
}