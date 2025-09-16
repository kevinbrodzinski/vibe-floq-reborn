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
  door_policy?: "open" | "cover" | "line" | "guest" | null;
  type?: "momentary" | "tribe" | "public";
  privacy?: "public" | "private" | "hidden";
  cohesion?: number;  // for momentary cards
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
    id: "m-01", name: "Lo-Fi Jazz & Late Night", status: "live",
    starts_at: mkTime(-90), ends_at: mkTime(45),
    participants: 58, friends_in: 3, friend_faces: faces(3, "m-01"),
    recsys_score: 0.86, energy_now: 0.78, energy_peak: 0.92,
    door_policy: "open", type: "momentary", privacy: "public",
    cohesion: 0.84,
  };

  const m2: MockFloq = {
    id: "m-02", name: "Rooftop Golden Hour", status: "live",
    starts_at: mkTime(-30), ends_at: mkTime(90),
    participants: 104, friends_in: 2, friend_faces: faces(2, "m-02"),
    recsys_score: 0.73, energy_now: 0.66, energy_peak: 0.88,
    door_policy: "line", type: "momentary", privacy: "public",
    cohesion: 0.72,
  };

  const m3: MockFloq = {
    id: "m-03", name: "Indie Film Afterparty", status: "upcoming",
    starts_at: mkTime(40), ends_at: mkTime(160),
    participants: 37, friends_in: 1, friend_faces: faces(1, "m-03"),
    recsys_score: 0.62, energy_now: 0.2, energy_peak: 0.77,
    door_policy: "guest", type: "momentary", privacy: "public",
    cohesion: 0.58,
  };

  const tribe1: MockFloq = {
    id: "t-01", name: "Core Crew: Thursdays", status: "upcoming",
    starts_at: mkTime(120), ends_at: mkTime(240),
    participants: 12, friends_in: 5, friend_faces: faces(5, "t-01"),
    recsys_score: 0.9, type: "tribe", privacy: "private",
    cohesion: 0.95,
  };

  const pub1: MockFloq = {
    id: "p-01", name: "Sunrise Yoga Club", status: "upcoming",
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
    { a: "m-01", b: "m-02", w: 0.8, kind: "time" },
    { a: "m-02", b: "m-03", w: 0.5, kind: "time" },
    { a: "m-01", b: "m-03", w: 0.33, kind: "friend", c: 1 },
    { a: "m-02", b: "t-01", w: 0.66, kind: "friend", c: 2 },
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