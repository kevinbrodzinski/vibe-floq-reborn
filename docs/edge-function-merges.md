# 🧩 Edge Function Merge Map

This document tracks the merged edge functions in Floq's Supabase/Deno backend for clarity, debugging, and future updates.

---

## ✅ Merged Function: `get-venue-intelligence.ts`

**File:** `supabase/functions/get-venue-intelligence/index.ts`

**Replaces:**
- `get-venue-people-list`
- `get-venue-recent-posts`
- `get-venue-social-energy`

**Modes Supported:**
- `people` - Returns list of people currently at venue
- `posts` - Returns recent venue posts/feed
- `energy` - Returns venue energy metrics and social texture

---

## ✅ Merged Function: `update-settings.ts`

**File:** `supabase/functions/update-settings/index.ts`

**Replaces:**
- `update-user-settings`
- `update-availability`
- `update-user-preferences`

**Targets Supported:**
- `user` - Updates user settings (notifications, theme, field settings, privacy)
- `floq` - Updates floq-specific settings
- `availability` - Updates user availability status
- `preferences` - Updates user preferences (vibe, suggestions, streaks, etc.)

---

## 🧠 Notes

- All merged functions use `mode` or `target` as the primary switch for behavior.
- Shared CORS, auth, and error logic is now standardized across these.
- Old function files have been deleted after client refactors are complete.
- Client-side hooks now use the unified endpoints with appropriate parameters.

---

## ✨ Usage Examples

### Venue Intelligence
```ts
// Get venue people
const { data } = await supabase.functions.invoke('get-venue-intelligence', {
  body: { venue_id: "...", mode: "people" }
});

// Get venue energy
const { data } = await supabase.functions.invoke('get-venue-intelligence', {
  body: { venue_id: "...", mode: "energy" }
});
```

### Settings Updates
```ts
// Update user settings
const { data } = await supabase.functions.invoke('update-settings', {
  body: { 
    target: "user", 
    updates: { theme_preferences: {...} }
  }
});

// Update availability
const { data } = await supabase.functions.invoke('update-settings', {
  body: { 
    target: "availability", 
    available_until: "2024-12-31T23:59:59Z"
  }
});
```

---

## 🔍 Debugging

Check logs in Supabase → Edge Function Invocations for specific function behavior.

---

**Last Updated:** January 2025  
**Consolidated Functions:** 6 → 2 (67% reduction)