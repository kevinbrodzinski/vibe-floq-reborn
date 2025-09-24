import { useEffect, useRef } from 'react';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';
import type { Vibe } from '@/types';

// Track vibe sessions for achievement progress with localStorage persistence
const SESSION_STORAGE_KEY = 'vibe_sessions';

interface VibeSession {
  vibe: Vibe;
  startTime: number;
  lastUpdate: number;
}

// Load sessions from localStorage
function loadSessions(): Map<string, VibeSession> {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.warn('Failed to load vibe sessions:', error);
  }
  return new Map();
}

// Save sessions to localStorage
function saveSessions(sessions: Map<string, VibeSession>) {
  try {
    const data = Object.fromEntries(sessions);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save vibe sessions:', error);
  }
}

const vibeSessionTracker = loadSessions();

export function useVibeSessionTracker(vibe: Vibe, enabled: boolean = true) {
  const sessionId = useRef<string | null>(null);
  const lastVibeRef = useRef<Vibe | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Start new session if vibe changed
    if (vibe !== lastVibeRef.current) {
      // End previous session if exists
      if (sessionId.current && lastVibeRef.current) {
        endVibeSession(sessionId.current);
      }

      // Start new session
      sessionId.current = `${Date.now()}-${Math.random()}`;
      startVibeSession(sessionId.current, vibe);
      lastVibeRef.current = vibe;
    }

    // Cleanup on unmount or when disabled
    return () => {
      if (sessionId.current) {
        endVibeSession(sessionId.current);
        sessionId.current = null;
      }
    };
  }, [vibe, enabled]);

  // Update session heartbeat every minute
  useEffect(() => {
    if (!enabled || !sessionId.current) return;

    const interval = setInterval(() => {
      if (sessionId.current) {
        updateVibeSession(sessionId.current);
      }
    }, 60_000); // 1 minute intervals

    return () => clearInterval(interval);
  }, [enabled, sessionId.current]);
}

function startVibeSession(sessionId: string, vibe: Vibe) {
  const now = Date.now();
  vibeSessionTracker.set(sessionId, {
    vibe,
    startTime: now,
    lastUpdate: now
  });
  
  saveSessions(vibeSessionTracker);
  console.debug(`Started vibe session: ${vibe}`, sessionId);
}

function updateVibeSession(sessionId: string) {
  const session = vibeSessionTracker.get(sessionId);
  if (!session) return;

  session.lastUpdate = Date.now();
  saveSessions(vibeSessionTracker);
  console.debug(`Updated vibe session: ${session.vibe}`, sessionId);
}

function endVibeSession(sessionId: string) {
  const session = vibeSessionTracker.get(sessionId);
  if (!session) return;

  const now = Date.now();
  const durationMs = now - session.startTime;
  const durationSec = Math.floor(durationMs / 1000);

  // Only track sessions longer than 30 seconds
  if (durationSec >= 30) {
    pushAchievementEvent('vibe_logged', {
      vibe: session.vibe,
      duration_sec: durationSec,
      session_id: sessionId
    });
    
    console.debug(`Ended vibe session: ${session.vibe} (${durationSec}s)`, sessionId);
  }

  vibeSessionTracker.delete(sessionId);
  saveSessions(vibeSessionTracker);
}