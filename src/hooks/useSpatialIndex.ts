
import { useMemo } from 'react';
import RBush from 'rbush';

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sprite?: any; // PIXI sprite reference
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function useSpatialIndex<T extends SpatialItem>(items: T[]) {
  const index = useMemo(() => {
    const tree = new RBush<T & BoundingBox>();
    
    const indexItems = items.map(item => ({
      ...item,
      minX: item.x - item.width / 2,
      minY: item.y - item.height / 2,
      maxX: item.x + item.width / 2,
      maxY: item.y + item.height / 2,
    }));
    
    if (indexItems.length > 0) {
      tree.load(indexItems);
    }
    
    return tree;
  }, [items]);

  const searchViewport = (bounds: BoundingBox): (T & BoundingBox)[] => {
    return index.search(bounds);
  };

  const getAllItems = (): (T & BoundingBox)[] => {
    return index.all();
  };

  return {
    searchViewport,
    getAllItems,
    tree: index,
  };
}
