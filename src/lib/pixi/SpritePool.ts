import { Graphics, Container } from 'pixi.js';

export class SpritePool<T extends Graphics | Container> {
  private free: T[] = [];
  private inUse = new Map<string, T>();

  constructor(private factory: () => T) {}

  preAllocate(n: number) {
    while (this.free.length < n) {
      this.free.push(this.factory());
    }
  }

  acquire(id: string): T {
    let obj = this.inUse.get(id);
    if (!obj) {
      obj = this.free.pop() ?? this.factory();
      this.inUse.set(id, obj);
    }
    return obj;
  }

  release(id: string) {
    const obj = this.inUse.get(id);
    if (!obj) return;
    
    if ((obj as any).parent) {
      (obj as any).parent.removeChild(obj);
    }
    if ((obj as any).clear) {
      (obj as any).clear(); // Graphics specific
    }
    
    this.inUse.delete(id);
    this.free.push(obj);
  }

  gc(max: number) {
    while (this.free.length > max) {
      this.free.pop()?.destroy();
    }
  }

  getStats() {
    return {
      free: this.free.length,
      inUse: this.inUse.size,
      total: this.free.length + this.inUse.size
    };
  }
}