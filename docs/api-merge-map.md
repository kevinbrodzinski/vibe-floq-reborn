
# 📘 Floq API Merge Map

This document tracks the consolidation of legacy edge functions into unified Supabase edge handlers. Use this to understand where functionality now lives, what each merged function handles, and how to call them.

---

## ✅ Merged Function: `generate-intelligence`
**File:** `/supabase/functions/generate-intelligence/index.ts`

**Replaces:**
- `generate-afterglow-summary`
- `generate-daily-afterglow`
- `generate-weekly-ai-suggestion`
- `generate-plan-summary`
- `generate-floq-auto-match`

**Modes Supported:**
- `afterglow-summary`
- `daily-afterglow`
- `weekly-ai`
- `plan-summary`
- `floq-auto-match`

---

## ✅ Merged Function: `get-venue-intelligence`
**File:** `/supabase/functions/get-venue-intelligence/index.ts`

**Replaces:**
- `get-venue-people-list`
- `get-venue-recent-posts`
- `get-venue-social-energy`

**Modes Supported:**
- `people`
- `posts`
- `energy`

---

## ✅ Merged Function: `send-invitations`
**File:** `/supabase/functions/send-invitations/index.ts`

**Replaces:**
- `invite-to-floq`
- `invite-external-friends`

**Types Supported:**
- `internal` - Send floq invitations to existing users
- `external` - Send email invitations for plans

---

## ✅ Merged Function: `floq-actions`
**File:** `/supabase/functions/floq-actions/index.ts`

**Replaces:**
- `floq-boost`
- `floq-mention-handler`

**Actions Supported:**
- `boost` - Boost a floq with rate limiting
- `mention` - Handle @floq mentions and notifications

---

## ✅ Merged Function: `update-settings`
**File:** `/supabase/functions/update-settings/index.ts`

**Replaces:**
- `update-user-settings`
- `update-availability`
- `update-floq-settings`

**Targets Supported:**
- `user` - Update user preferences and settings
- `availability` - Update user availability status
- `floq` - Update floq-specific settings

---

## 🧠 Client-Side Call Helpers

All merged functions are accessible via typed wrappers:
- `callGenerateIntelligence(mode, payload)`
- `callGetVenueData(type, venueId)` → `get-venue-intelligence`
- `callSendInvitations(type, payload)`
- `callFloqActions(action, payload)`
- `callUpdateSettings(target, payload)`

These are located in:
```ts
/src/lib/api/*
```

---

## 🧹 Cleanup Status

**✅ Completed:**
- RLS policies unified and consolidated
- Edge functions merged and deployed
- Client helpers updated and tested
- Legacy function directories removed

**🔄 Next Steps:**
- Run cleanup script to identify unused types
- Remove deprecated SQL RPC functions
- Verify all function calls work correctly

---

This document is maintained alongside `supabase/functions/`, `/types/enums`, and `/sql/migrations/`.
