import type { AvatarItem } from "@/components/floqs/visual/AvatarStack";
import type { ConstellationNode, ConstellationEdge } from "@/hooks/useFloqsHubData";

export type MockFloq = {
  id: string;
  name: string;
  status: "live" | "upcoming" | "ended";
  starts_at: string;  // required for momentary
  ends_at: string;    // required for momentary
  participants?: number;
  friends_in?: number;
  friend_faces?: Array<{ id: string; name: string; avatar_url?: string | null; floq_id?: string | null }>;
  recsys_score?: number;
  energy_now?: number;
  energy_peak?: number;
  eta_minutes?: number;
  vibe_delta?: number;
  door_policy?: "open" | "cover" | "line" | "guest" | null;
  type?: "momentary" | "tribe" | "public";
  privacy?: "public" | "private" | "hidden";
  cohesion?: number;  // for momentary cards
};

// Mock UUIDs for stable testing
const MOCK_FLOQ_IDS = {
  m1: "550e8400-e29b-41d4-a716-446655440001",
  m2: "550e8400-e29b-41d4-a716-446655440002", 
  m3: "550e8400-e29b-41d4-a716-446655440003",
  tribe1: "550e8400-e29b-41d4-a716-446655440004",
  pub1: "550e8400-e29b-41d4-a716-446655440005",
};

export function getFloqsMock(now = Date.now()) {
  const hour = 60 * 60 * 1000;
  const mkTime = (offsetMin: number) => new Date(now + offsetMin * 60_000).toISOString();
  const faces = (n: number, floqId?: string) =>
    Array.from({ length: n }, (_, i) => ({
      id: `u${i + 1}`,
      name: demoNames[i % demoNames.length],
      avatar_url: null, // keep offline-safe; set to a URL if you want
      floq_id: floqId ?? null,
    }));

  const m1: MockFloq = {
    id: MOCK_FLOQ_IDS.m1, name: "Nordic Ice Plunge", status: "live",
    starts_at: mkTime(-90), ends_at: mkTime(45),
    participants: 58, friends_in: 3, friend_faces: faces(3, MOCK_FLOQ_IDS.m1),
    recsys_score: 0.86, energy_now: 0.78, energy_peak: 0.92,
    door_policy: "open", type: "momentary", privacy: "public",
    cohesion: 0.84,
  };

  const m2: MockFloq = {
    id: MOCK_FLOQ_IDS.m2, name: "Rooftop Golden Hour", status: "live",
    starts_at: mkTime(-30), ends_at: mkTime(90),
    participants: 104, friends_in: 2, friend_faces: faces(2, MOCK_FLOQ_IDS.m2),
    recsys_score: 0.73, energy_now: 0.66, energy_peak: 0.88,
    eta_minutes: 12, vibe_delta: 0.18,
    door_policy: "line", type: "momentary", privacy: "public",
    cohesion: 0.72,
  };

  const m3: MockFloq = {
    id: MOCK_FLOQ_IDS.m3, name: "Indie Film Afterparty", status: "upcoming",
    starts_at: mkTime(40), ends_at: mkTime(160),
    participants: 37, friends_in: 1, friend_faces: faces(1, MOCK_FLOQ_IDS.m3),
    recsys_score: 0.62, energy_now: 0.2, energy_peak: 0.77,
    eta_minutes: 24, vibe_delta: 0.35,
    door_policy: "guest", type: "momentary", privacy: "public",
    cohesion: 0.58,
  };

  const tribe1: MockFloq = {
    id: MOCK_FLOQ_IDS.tribe1, name: "Core Crew: Thursdays", status: "upcoming",  
    starts_at: mkTime(120), ends_at: mkTime(240),
    participants: 12, friends_in: 5, friend_faces: faces(5, MOCK_FLOQ_IDS.tribe1),
    recsys_score: 0.9, type: "tribe", privacy: "private",
    cohesion: 0.95,
  };

  const pub1: MockFloq = {
    id: MOCK_FLOQ_IDS.pub1, name: "Sunrise Yoga Club", status: "upcoming",
    starts_at: mkTime(600), ends_at: mkTime(660),
    participants: 26, friends_in: 0, recsys_score: 0.4,
    type: "public", privacy: "public",  
    cohesion: 0.65,
  };

  // Constellation nodes (top 60) and edges (time + friend)
  const all = [m1, m2, m3, tribe1, pub1];
  const constellationNodes: ConstellationNode[] = all.slice(0, 5).map((f, i) => ({
    id: f.id,
    name: f.name,
    status: f.status === "live" ? "live" : "upcoming",
    participants: f.participants ?? 0,
    friends_in: f.friends_in ?? 0,
    score: clamp01(0.6 * (f.recsys_score ?? 0.5) + 0.3 * (f.status === "live" ? 1 : 0.6) + 0.1 * 0.5),
  }));

  const edges: ConstellationEdge[] = [
    { a: MOCK_FLOQ_IDS.m1, b: MOCK_FLOQ_IDS.m2, w: 0.8, kind: "time" },
    { a: MOCK_FLOQ_IDS.m2, b: MOCK_FLOQ_IDS.m3, w: 0.5, kind: "time" },
    { a: MOCK_FLOQ_IDS.m1, b: MOCK_FLOQ_IDS.m3, w: 0.33, kind: "friend", c: 1 },
    { a: MOCK_FLOQ_IDS.m2, b: MOCK_FLOQ_IDS.tribe1, w: 0.66, kind: "friend", c: 2 },
  ];

  return {
    momentaryLive: [m1, m2].filter(f => f.status === "live"),
    tribes: [tribe1],
    publicFloqs: [pub1],
    discover: [m3, m2, pub1, m1],
    constellationNodes,
    constellationEdges: edges.slice(0, 120),
  };
}

const demoNames = [
  "Maya Chen","Leo Park","Ava Gomez","Noah Patel","Ivy Nguyen","Eli Brooks",
  "Zoe Rivera","Kai Thompson","Luna Reed","Milo Ortiz"
];

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

// Mock floq details for demo/testing
export function getMockFloqDetails(floqId: string, now = Date.now()) {
  const mocks = getFloqsMock(now);
  const allFloqs = [...mocks.momentaryLive, ...mocks.tribes, ...mocks.publicFloqs, ...mocks.discover];
  const mockFloq = allFloqs.find(f => f.id === floqId);
  
  if (!mockFloq) return null;

  // Generate mock participants
  const mockParticipants = mockFloq.friend_faces?.map(face => ({
    profile_id: face.id,
    username: face.name.toLowerCase().replace(' ', ''),
    display_name: face.name,
    avatar_url: face.avatar_url,
    role: 'member',
    joined_at: new Date(now - Math.random() * 3600000).toISOString(),
  })) || [];

  return {
    id: mockFloq.id,
    title: mockFloq.name,
    description: `A ${mockFloq.type} floq with ${mockFloq.participants} participants`,
    primary_vibe: 'hype' as const,
    creator_id: 'mock-creator-id', 
    participant_count: mockFloq.participants || 0,
    starts_at: mockFloq.starts_at,
    ends_at: mockFloq.ends_at,
    created_at: mockFloq.starts_at,
    visibility: mockFloq.privacy || 'public',
    pinned_note: null,
    flock_type: mockFloq.type as any,
    location: { lat: 34.0522, lng: -118.2437 },
    participants: mockParticipants,
    pending_invites: [],
    is_joined: false,
    is_creator: false,
    user_role: undefined,
  };
}

// Export the mock IDs for use in other files  
export { MOCK_FLOQ_IDS };