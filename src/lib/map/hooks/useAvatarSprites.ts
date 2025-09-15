import { useEffect, useMemo, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';

type AvatarItem = { id: string; photoUrl?: string | null };
type Options = { size?: number; concurrency?: number; retryMs?: number };

const DEFAULTS: Required<Options> = { size: 64, concurrency: 3, retryMs: 250 };

/** Stable icon id for a user & size (same across style reloads) */
export const avatarIconIdFor = (userId: string, size = 64) => `avatar:${userId}:${size}`;

function loadImageEl(src: string, size: number, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', onAbort, { once: true });
    img.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      resolve(img);
    };
    img.onerror = (e) => {
      signal?.removeEventListener('abort', onAbort);
      reject(e);
    };
    img.src = src;
  });
}

function toCircleSprite(img: HTMLImageElement, size: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // crisp downscale if needed
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // circle mask
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

/**
 * Load/circle-mask/addImage for user avatars with:
 * - de-duplication (iconId reused)
 * - concurrency limit
 * - auto re-queue on style reload
 * Returns a map of { userId -> iconId } and loading counts.
 */
export function useAvatarSprites(
  map: mapboxgl.Map | null | undefined,
  items: AvatarItem[] | undefined,
  opts?: Options
) {
  const { size, concurrency, retryMs } = { ...DEFAULTS, ...(opts || {}) };
  const [iconIds, setIconIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(0);

  // Safe inputs
  const list = useMemo(
    () => (Array.isArray(items) ? items.filter(i => i && i.id && i.photoUrl) : []),
    [items]
  );

  const queueRef = useRef<string[]>([]);
  const inflightRef = useRef<Set<string>>(new Set());
  const loadedRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Rebuild queue whenever the list changes or style is new
  const rebuildQueue = () => {
    if (!map) return;
    const q: string[] = [];
    for (const it of list) {
      const iconId = avatarIconIdFor(it.id, size);
      // if style has image, mark loaded; else queue
      if (map.hasImage(iconId)) {
        loadedRef.current.add(it.id);
      } else {
        q.push(it.id);
      }
    }
    queueRef.current = q;
  };

  // Worker: process queue with concurrency
  const pump = async () => {
    if (!map || !mountedRef.current) return;

    // Start up to `concurrency - inflight`
    while (
      inflightRef.current.size < concurrency &&
      queueRef.current.length > 0 &&
      mountedRef.current
    ) {
      const userId = queueRef.current.shift()!;
      if (inflightRef.current.has(userId) || loadedRef.current.has(userId)) continue;

      inflightRef.current.add(userId);
      setLoading(prev => prev + 1);

      (async () => {
        const item = list.find(i => i.id === userId);
        if (!item?.photoUrl) throw new Error('no photoUrl');

        const c = new AbortController();
        abortRef.current?.signal?.aborted; // just touch
        const signal = c.signal;
        try {
          // Load & circle-mask
          const img = await loadImageEl(item.photoUrl, size, signal);
          const data = toCircleSprite(img, size);
          const iconId = avatarIconIdFor(userId, size);
          if (!map) return;
          if (!map.hasImage(iconId)) {
            map.addImage(iconId, data, { pixelRatio: 1 });
          }
          loadedRef.current.add(userId);
          setIconIds(prev => (prev[userId] === iconId ? prev : { ...prev, [userId]: iconId }));
        } catch {
          // Back off & requeue once
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (!loadedRef.current.has(userId)) queueRef.current.push(userId);
            pump(); // try again
          }, retryMs);
        } finally {
          inflightRef.current.delete(userId);
          setLoading(prev => Math.max(0, prev - 1));
          // continue queue
          // (yield first to keep UI responsive)
          requestAnimationFrame(() => pump());
        }
      })();
    }
  };

  // Main effect
  useEffect(() => {
    mountedRef.current = true;
    if (!map || !list.length) return;

    rebuildQueue();
    pump();

    // On style reload, images are wiped → requeue
    const reapply = () => {
      if (!mountedRef.current) return;
      loadedRef.current.clear();
      rebuildQueue();
      pump();
    };
    map.on('styledata', reapply);

    return () => {
      mountedRef.current = false;
      map.off('styledata', reapply);
      abortRef.current?.abort();
      inflightRef.current.clear();
      queueRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, size, concurrency, list.map(i => i.id + ':' + (i.photoUrl || '')).join('|')]);

  return { iconIds, loading };
}
