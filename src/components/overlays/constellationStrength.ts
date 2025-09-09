export type RawInteraction = { a: string; b: string; last: number; count: number };

export function toEdgesFromLocal(rs: RawInteraction[]) {
  const now = Date.now();
  return rs.map(r => {
    const days = Math.max(1, (now - r.last) / (1000*60*60*24));
    const recency = Math.max(0, 1 - Math.min(1, days / 30));
    const freq    = Math.min(1, r.count / 10);
    const strength = Math.max(0.1, Math.min(1, 0.6*recency + 0.4*freq));
    return { a: r.a, b: r.b, strength };
  });
}

export function mergeEdges(server: {a:string;b:string;strength:number}[], local: {a:string;b:string;strength:number}[]) {
  const m = new Map<string, { a:string;b:string;strength:number }>();
  for (const e of server) m.set(`${e.a}::${e.b}`, e);
  for (const e of local) {
    const k = `${e.a}::${e.b}`;
    const cur = m.get(k);
    if (!cur) m.set(k, e);
    else m.set(k, { ...cur, strength: Math.max(cur.strength, e.strength) });
  }
  return Array.from(m.values());
}