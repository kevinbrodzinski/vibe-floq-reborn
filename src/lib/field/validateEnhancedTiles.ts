import { z } from "zod";
import {
  EnhancedFieldTileSchema,
  EnhancedFieldTilesResponseSchema,
} from "../../../packages/types/domain/enhanced-field.schemas";
import type { EnhancedFieldTile, EnhancedFieldTilesResponse } from '../../../packages/types/domain/enhanced-field';

// Dev log throttling
let lastLog = 0;
function logDevOnce(msg: string, obj?: unknown) {
  if (!import.meta.env.DEV) return;
  const now = Date.now();
  if (now - lastLog < 5000) return; // 5s backoff
  lastLog = now;
  // Redact PII-like lists
  const safe = obj && typeof obj === "object"
    ? JSON.parse(JSON.stringify(obj, (k, v) =>
        k === "active_floq_ids" && Array.isArray(v) ? `[${v.length} ids]` : v))
    : obj;
  // eslint-disable-next-line no-console
  console.warn("[EnhancedTiles] schema warning:", msg, safe ?? "");
}

/**
 * Validates the full response payload. If it fails, tries to salvage valid tiles
 * by validating per-tile and returns only tiles that pass.
 * Never throws in production — returns { tiles: [] } at worst.
 */
export function validateEnhancedTiles(
  payload: unknown,
  { allowPartial = true }: { allowPartial?: boolean } = {}
): EnhancedFieldTilesResponse {
  // a) Fast path: full response matches
  const all = EnhancedFieldTilesResponseSchema.safeParse(payload);
  if (all.success) return all.data as EnhancedFieldTilesResponse;

  logDevOnce("Response shape mismatch", all.error.format());

  // b) Fallback: salvage per-tile if allowed
  if (allowPartial && payload && typeof payload === "object" && "tiles" in (payload as any)) {
    const raw = (payload as any).tiles as unknown[];
    if (Array.isArray(raw)) {
      const ok: EnhancedFieldTile[] = [];
      const badIdx: number[] = [];
      raw.forEach((t, i) => {
        const p = EnhancedFieldTileSchema.safeParse(t);
        if (p.success) ok.push(p.data as EnhancedFieldTile);
        else badIdx.push(i);
      });
      if (badIdx.length) logDevOnce(`Dropped invalid tiles [${badIdx.join(",")}]`);
      return { tiles: ok };
    }
  }

  // c) Fail open (return empty, never throw in prod)
  return { tiles: [] };
}