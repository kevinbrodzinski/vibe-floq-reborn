export type FriendHead = { lng: number; lat: number; t_head: string };
export type PathPoint = { lng: number; lat: number; t?: number };

const cache = {
  heads: [] as FriendHead[],
  path: [] as PathPoint[],
  conv: undefined as number | undefined,
};

export const socialCache = {
  setFriendHeads(h: FriendHead[]) { 
    cache.heads = h || []; 
  },
  setMyPath(p: PathPoint[]) { 
    cache.path = p || []; 
  },
  setConvergenceProb(p?: number) { 
    cache.conv = p; 
  },
  getFriendHeads: () => cache.heads,
  getMyPath: () => cache.path,
  getConvergenceProb: () => cache.conv,
};