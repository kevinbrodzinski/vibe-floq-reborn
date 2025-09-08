export type StormState = 'forming' | 'active' | 'dissipating';

export interface Storm {
  id: string; 
  x: number; 
  y: number;
  intensity: number;  // 0..1
  state: StormState;
  born: number;       // ms
  ttl: number;        // ms total
  lastSupport: number; // ms since last reinforcing lanes
}

export interface StormInput {
  id: string; 
  x: number; 
  y: number; 
  intensity: number; // from worker groups
}

export class StormFSM {
  private storms = new Map<string, Storm>();
  
  constructor(private now = () => performance.now()) {}

  update(inputs: StormInput[], deltaMS = 16.7): Storm[] {
    const t = this.now();

    // reinforce or create
    for (const s of inputs) {
      const hit = this.storms.get(s.id);
      if (hit) {
        hit.x = s.x; 
        hit.y = s.y;
        hit.intensity = Math.max(hit.intensity * 0.8, s.intensity); // smooth
        hit.lastSupport = 0;
        if (hit.state === 'forming' && hit.intensity > 0.6) hit.state = 'active';
      } else {
        this.storms.set(s.id, {
          id: s.id, 
          x: s.x, 
          y: s.y, 
          intensity: s.intensity,
          state: 'forming', 
          born: t, 
          ttl: 20_000, 
          lastSupport: 0
        });
      }
    }

    // evolve states and prune
    const out: Storm[] = [];
    for (const [id, st] of this.storms) {
      st.lastSupport += deltaMS;

      if (st.state === 'active' && st.lastSupport > 3000) st.state = 'dissipating';
      if (st.state === 'forming' && st.intensity < 0.2 && st.lastSupport > 4000) {
        this.storms.delete(id);
        continue;
      }

      if (st.state === 'dissipating') {
        st.intensity *= 1 - Math.min(1, deltaMS / 2000); // ~0.96 per 60fps
        if (st.intensity < 0.1) { 
          this.storms.delete(id); 
          continue; 
        }
      }
      out.push(st);
    }
    return out;
  }

  getAll(): Storm[] { 
    return Array.from(this.storms.values()); 
  }
  
  clear() { 
    this.storms.clear(); 
  }
}