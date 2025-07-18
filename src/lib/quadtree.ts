import { quadtree as d3qt } from 'd3-quadtree';

export interface TileForTree {
  x: number;
  y: number;
  radius: number;
  tile_id: string;
  crowd_count: number;
  avg_vibe: any;
}

export function buildTileTree(tiles: TileForTree[]) {
  const tree = d3qt<TileForTree>()
    .x(t => t.x)
    .y(t => t.y)
    .addAll(tiles);
  return tree;
}

export function hitTest(tree: ReturnType<typeof d3qt<TileForTree>>, x: number, y: number, r: number) {
  let found: TileForTree | null = null;
  tree.visit((node, x0, y0, x1, y1) => {
    if (!node.length) {
      const t: TileForTree = (node as any).data;
      const dx = t.x - x;
      const dy = t.y - y;
      if (dx * dx + dy * dy < (t.radius + r) ** 2) {
        found = t;
        return true; // stop
      }
    }
    return x0 > x + r || x1 < x - r || y0 > y + r || y1 < y - r;
  });
  return found;
}