
import { useMemo, useRef, useEffect } from 'react';
import RBush from 'rbush';

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  sprite: any; // PIXI sprite reference
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BoundsQuery extends BoundingBox {
  dummy?: never;
}

export function useSpatialIndex<T extends SpatialItem>(items: T[]) {
  const treeRef = useRef<RBush<T>>(new RBush<T>());
  
  useEffect(() => {
    const tree = treeRef.current;
    tree.clear();
    if (items.length > 0) {
      tree.load(items);
    }
  }, [items]);

  const searchViewport = (bounds: BoundsQuery): T[] => {
    return treeRef.current.search(bounds as any);
  };

  const getAllItems = (): T[] => {
    return treeRef.current.all();
  };

  return {
    searchViewport,
    getAllItems,
    tree: treeRef.current,
  };
}
