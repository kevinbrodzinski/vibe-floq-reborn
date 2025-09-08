import { assertEquals, assert, assertArrayIncludes } from "https://deno.land/std@0.204.0/testing/asserts.ts";
import { shapeTilesForViewer } from "../_shared/enhance.ts";

Deno.test("K-anonymity hides velocity/history/ids when crowd_count < 5", () => {
  const tiles = shapeTilesForViewer(
    [{
      tile_id: "t1",
      crowd_count: 3, // under K
      avg_vibe: { h: 200, s: 60, l: 50 },
      updated_at: new Date().toISOString(),
      centroid: { lat: 34.05, lng: -118.25 },
      active_floq_ids: ["00000000-0000-0000-0000-000000000001"]
    }],
    true, // includeHistory
    { close: new Set<string>(["00000000-0000-0000-0000-000000000001"]), friends: new Set<string>() },
    "viewer-uuid"
  );

  assertEquals(tiles.length, 1);
  const t = tiles[0];
  assertEquals(t.active_floq_ids.length, 0, "IDs must be hidden under K");
  assertEquals(t.history, undefined, "history must be omitted under K");
  assertEquals(t.velocity, undefined, "velocity must be omitted under K");
});

Deno.test("Audience scoping includes close & friends, excludes public", () => {
  const closeId   = "00000000-0000-0000-0000-0000000000aa";
  const friendId  = "00000000-0000-0000-0000-0000000000bb";
  const publicId  = "00000000-0000-0000-0000-0000000000cc";

  const tiles = shapeTilesForViewer(
    [{
      tile_id: "t2",
      crowd_count: 12, // over K
      avg_vibe: { h: 90, s: 60, l: 48 },
      updated_at: new Date().toISOString(),
      centroid: { lat: 37.77, lng: -122.42 },
      active_floq_ids: [closeId, friendId, publicId]
    }],
    true,
    { close: new Set<string>([closeId]), friends: new Set<string>([friendId, closeId]) },
    "viewer-uuid"
  );

  const t = tiles[0];
  assertArrayIncludes(t.active_floq_ids, [closeId], "should include close");
  assertArrayIncludes(t.active_floq_ids, [friendId], "should include friends");
  assert(!t.active_floq_ids.includes(publicId), "must exclude public");
  assert(t.history && t.history.length === 1, "history is visible over K");
});