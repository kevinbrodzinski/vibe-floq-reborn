# FLOQ • Troubleshooting & Long-Term Maintenance
_Last updated: 2025-07-11_

## 0. Golden Path (TL;DR)
| Symptom | One-liner Fix |
|---------|---------------|
| **Avatar console spam** | Supabase `StorageClient` ➜ use native `<link rel="preload">` and memoise URLs (`useAvatarUrl`). |
| **400s on `/friend_requests?select=*`** | Use `v_friends_with_profile` view + `get_friends_with_profile()` RPC; update hooks + cache keys. |
| **TS "SelectQueryError" unions** | Export the Supabase client as `any` _once_ (`export const supabase = baseClient as any;`) and keep data-layer type guards in hooks. |
| **Location permission violation** | Wrap calls in `requestLocation()` behind explicit user gesture. |
| **WebSocket reconnect storm** | Add `.on('CHANNEL_ERROR' \|\| 'CLOSED')` handler with back-off & single retry. |

---

## 1. Friends / Social Graph

### 1.1 Why we chose the **View + RPC** approach  
* **Single source of truth** in Postgres – no client-side JOIN logic.  
* RLS lives on the _view_, so auth rules are declared once.  
* Indexes on `friendships` keep the query O(log n) even with thousands of friends.  
* Front-end = one simple `useQuery()` call → less surface for bugs.

```sql
create or replace view public.v_friends_with_profile as …
create or replace function public.get_friends_with_profile() returns setof public.v_friends_with_profile as …
```

### 1.2 Hook Contract (useFriendsWithProfile)

```typescript
type FriendWithProfile = {
  friend_id: string
  username?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  friendship_created_at: string
}
```

Never pass user_id from the client – the RPC resolves it with `auth.uid()`.

### 1.3 Cache Discipline

```typescript
queryClient.invalidateQueries({ queryKey: ["friends-with-profile"] })
```

Always bump the same key after add / remove to guarantee UI freshness.

---

## 2. Avatars & Storage Noise

| Problem | Root Cause | Long-Term Fix |
|---------|------------|---------------|
| "Skipping pre-warm of unsigned storage URL" lines | Supabase JS pre-warms every public/* asset. | 1) Override StorageClient.prewarmUrl() in prod; 2) Replace with `<link rel="preload">`; 3) Memoise URLs → zero duplicates. |
| Broken images | User deleted from storage or URL 404 | EnhancedAvatar falls back to initials/gradient. |

---

## 3. Geolocation
* Do not call `navigator.geolocation.getCurrentPosition()` on mount.
* Expose `requestLocation()` from the hook and trigger on button or sheet open.
* Cache last good coords (`localStorage:lastKnownCoords`) so the UI can paint immediately while fresh coords are fetched.

---

## 4. WebSocket / Realtime

```typescript
supabase
  .channel(`presence:${geohash}`)
  .subscribe(status => {
    if (status === "CHANNEL_ERROR" || status === "CLOSED") {
      setTimeout(() => channel.subscribe(), PRESENCE_RETRY_DELAY_MS)
    }
  })
```

* Keep `PRESENCE_RETRY_DELAY_MS` ≥ 5 s to avoid hammering.
* Track failures with `track('presence_ws_error', { geohash, status })`.

---

## 5. TypeScript Gotchas
* Supabase 2.x unions data with SelectQueryError; the project now opts-out once:

```typescript
export const supabase = baseClient as any
```

All validation lives in the hooks (`if (error) throw error`).

* Prefer `maybeSingle()` over `single()` when the row may not exist.

---

## 6. Performance Cheatsheet

| Area | Target | Current | Note |
|------|--------|---------|------|
| Friends RPC | ≤ 120 ms P95 | ~ 45 ms | OK |
| Avatars (LCP) | < 2.5 s | 1.2 s | after preload fix |
| Field WS reconnect | ≤ 3 / min | 0–1 / min | after back-off |

---

## 7. When to Re-generate Types

Run `npx supabase gen types typescript --project-id <id> --schema public > src/db/types.ts` only after:
1. New columns/views you need in client code.
2. Enum additions (vibe_tag, etc.).

---

## Appendix A – Quick SQL Debug

```sql
-- Who are my friends?
select * from public.v_friends_with_profile limit 10;

-- Inspect RLS on view
select * from pg_policies where tablename = 'v_friends_with_profile';
```

---

**Happy shipping!**  
If you add a new social feature, build the view first, put RLS on it, then call it from React.