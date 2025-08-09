const KEY = 'floq-mock-mode-expiry';

export function enableMockModeForSeconds(seconds: number) {
  const until = Date.now() + Math.max(0, Math.floor(seconds)) * 1000;
  try { localStorage.setItem(KEY, String(until)); } catch {}
  try { window.dispatchEvent(new CustomEvent('floq:mockModeChanged')); } catch {}
}

export function disableMockMode() {
  try { localStorage.removeItem(KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent('floq:mockModeChanged')); } catch {}
}

export function isMockModeEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until) || until <= Date.now()) {
      localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getMockModeRemainingSeconds(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const until = Number(raw);
    return Math.max(0, Math.floor((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

// Simple random helpers
function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function metersToDegreesLat(m: number) { return m / 111_111; }
function metersToDegreesLng(m: number, lat: number) { return m / (111_111 * Math.cos((lat * Math.PI) / 180)); }

export type MockFloq = { id: string; title: string; lat: number; lng: number; primary_vibe: string; participant_count: number };
export type MockPerson = { id: string; lat: number; lng: number; vibe?: string };

const VIBES = ['social','hype','chill','curious','solo','romantic','weird','down','flowing','open'];

export function generateMockFloqs(centerLat: number, centerLng: number, count = 8): MockFloq[] {
  const out: MockFloq[] = [];
  for (let i = 0; i < count; i++) {
    const distM = rnd(80, 800);
    const bearing = rnd(0, Math.PI * 2);
    const dLat = metersToDegreesLat(Math.sin(bearing) * distM);
    const dLng = metersToDegreesLng(Math.cos(bearing) * distM, centerLat);
    out.push({
      id: `mock-floq-${i}-${Date.now()}`,
      title: `Mock Floq ${i + 1}`,
      lat: centerLat + dLat,
      lng: centerLng + dLng,
      primary_vibe: VIBES[Math.floor(rnd(0, VIBES.length))],
      participant_count: Math.floor(rnd(3, 25))
    });
  }
  return out;
}

export function generateMockPeople(centerLat: number, centerLng: number, count = 12): MockPerson[] {
  const out: MockPerson[] = [];
  for (let i = 0; i < count; i++) {
    const distM = rnd(30, 600);
    const bearing = rnd(0, Math.PI * 2);
    const dLat = metersToDegreesLat(Math.sin(bearing) * distM);
    const dLng = metersToDegreesLng(Math.cos(bearing) * distM, centerLat);
    out.push({
      id: `mock-person-${i}-${Date.now()}`,
      lat: centerLat + dLat,
      lng: centerLng + dLng,
      vibe: VIBES[Math.floor(rnd(0, VIBES.length))]
    });
  }
  return out;
}

// Expose convenient window helpers for manual enabling during demos
declare global {
  interface Window {
    enableFloqMockMode?: (seconds: number) => void;
    disableFloqMockMode?: () => void;
    getFloqMockRemaining?: () => number;
  }
}

if (typeof window !== 'undefined') {
  window.enableFloqMockMode = (seconds: number) => enableMockModeForSeconds(seconds);
  window.disableFloqMockMode = () => disableMockMode();
  window.getFloqMockRemaining = () => getMockModeRemainingSeconds();
}