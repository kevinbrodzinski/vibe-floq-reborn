// ─────────────────────────────────────────────────────────────
// 📁 src/lib/cache/transitLRU.ts
//  Simple in‑memory LRU (per session) to avoid duplicate function calls
//  between components before React‑Query cache kicks in.
// ─────────────────────────────────────────────────────────────

interface LRUNode<T> {
  key: string;
  value: { promise: Promise<T>; ts: number };
  prev?: LRUNode<T>;
  next?: LRUNode<T>;
}

class SimpleLRU<T> {
  private maxSize: number;
  private ttl: number;
  private cache = new Map<string, LRUNode<T>>();
  private head?: LRUNode<T>;
  private tail?: LRUNode<T>;

  constructor(maxSize = 500, ttl = 1000 * 60 * 15) { // 15 min TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): { promise: Promise<T>; ts: number } | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    // Check TTL
    if (Date.now() - node.value.ts > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    return node.value;
  }

  set(key: string, value: { promise: Promise<T>; ts: number }): void {
    const existingNode = this.cache.get(key);
    if (existingNode) {
      existingNode.value = value;
      this.moveToFront(existingNode);
      return;
    }

    // Create new node
    const newNode: LRUNode<T> = { key, value };
    this.cache.set(key, newNode);

    // Add to front
    if (!this.head) {
      this.head = this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    }

    // Evict if necessary
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  private delete(key: string): void {
    const node = this.cache.get(key);
    if (!node) return;

    this.cache.delete(key);
    this.removeNode(node);
  }

  private moveToFront(node: LRUNode<T>): void {
    if (node === this.head) return;

    this.removeNode(node);
    
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
  }

  private removeNode(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = node.next = undefined;
  }

  private evictLRU(): void {
    if (!this.tail) return;
    
    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}

const lru = new SimpleLRU<any>(500, 1000 * 60 * 15); // 15 min TTL

export function memoizeTransit<Request, Response>(key: string, fn: () => Promise<Response>): Promise<Response> {
  const cached = lru.get(key);
  if (cached) return cached.promise as Promise<Response>;
  
  const promise = fn();
  lru.set(key, { promise, ts: Date.now() });
  return promise;
}