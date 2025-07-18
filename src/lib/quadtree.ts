import { quadtree, Quadtree } from 'd3-quadtree';
import type { ScreenTile } from '@/types/field';

export const buildTileTree = (tiles: ScreenTile[]) =>
  quadtree<ScreenTile>()
    .x(t => t.x)
    .y(t => t.y)
    .addAll(tiles);

export function hitTest(
  tree: Quadtree<ScreenTile>, x: number, y: number, r = 12
): ScreenTile | null {
  let found: ScreenTile | null = null;
  tree.visit((node, x0, y0, x1, y1) => {
    if (!node.length) {
      const t = (node as any).data as ScreenTile;
      const dx = t.x - x, dy = t.y - y;
      if (dx * dx + dy * dy < (t.radius + r) ** 2) {
        found = t; return true;
      }
    }
    return x0 > x + r || x1 < x - r || y0 > y + r || y1 < y - r;
  });
  return found;
}