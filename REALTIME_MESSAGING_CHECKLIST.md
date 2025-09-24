# Realtime Messaging System - Sanity Checklist

## 🎯 Quick Health Check for P2P Messaging System

Use this checklist to diagnose and prevent common realtime messaging issues.

### ✅ **Edge Functions CORS Configuration**

**All messaging-related Edge Functions must return:**
- ✅ `OPTIONS 200` response for preflight requests
- ✅ `Access-Control-Allow-Headers` including: `authorization, x-client-info, apikey, content-type, range-unit`
- ✅ All JSON responses include CORS headers

**Files to check:**
- `/supabase/functions/send-message/index.ts`
- `/supabase/functions/toggle-dm-reaction/index.ts` 
- `/supabase/functions/mark-thread-read/index.ts`
- `/supabase/functions/search-threads/index.ts`

**Example CORS setup:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range-unit',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// Include in all responses
return new Response(JSON.stringify(result), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### ✅ **Frontend API Helper Configuration**

**`supaFn.ts` should only set minimal headers:**
- ✅ `Authorization: Bearer ${token}`
- ✅ `apikey: ${SUPABASE_ANON_KEY}`
- ✅ `Content-Type: application/json`
- ❌ **DO NOT** forward `Range`, `Range-Unit`, or other headers to functions

### ✅ **Realtime Subscription Stability**

**Effects must NOT depend on changing arrays/objects:**
- ❌ `[threadId, currentUserId, queryClient, queryKey, reactions]` ← `reactions` causes resubscribe loop
- ✅ `[threadId, currentUserId, queryClient]` ← Only stable values

**Channel keys and names must be stable:**
- ✅ `reactions:${threadId}` ← Stable per thread
- ✅ `dm_reactions_${threadId}` ← Stable per thread
- ✅ `reactions-hook-${threadId}` ← Stable per thread (use `useRef` for uniqueness)

**Files to verify:**
- `/src/hooks/messaging/useMessageReactions.ts`
- `/src/hooks/messaging/useTypingIndicators.ts`
- `/src/hooks/messaging/useThreads.ts`

### ✅ **Subscription Management Best Practices**

- ✅ Don't clean up a channel you're about to reuse
- ✅ Use `realtimeManager.subscribe()` with stable hook IDs
- ✅ Guard against double-subscription with `creating` set
- ✅ Only subscribe when you have valid UUID `threadId`
- ✅ Handle subscription errors gracefully (don't throw)

### ✅ **Optimistic Updates & Error Handling**

**When optimistically updating reactions/messages:**
- ✅ Use `mutateAsync()` with proper `try-catch`
- ✅ Handle rollback on error with user-friendly toast
- ✅ Don't let failed mutations freeze the UI
- ✅ Check for duplicates before adding to cache

**Example error handling:**
```typescript
const handleReaction = async (emoji: string) => {
  try {
    await toggleReaction.mutateAsync({ messageId: message.id, emoji });
    setShowReactionPicker(false);
  } catch (error: any) {
    console.error('[MessageBubble] Reaction failed:', error);
    toast.error('Failed to add reaction', {
      description: error.message || 'Please try again'
    });
  }
};
```

### ✅ **Database Migration Status**

**Verify P2P migrations are applied:**
- ✅ `create_or_get_thread` function exists
- ✅ `toggle_dm_reaction` function exists  
- ✅ `search_direct_threads_enhanced` function exists
- ✅ `get_dm_reactions_by_thread` function exists
- ✅ `dm_message_reactions` table exists with RLS policies
- ✅ Performance indexes are applied

### ✅ **Common Issue Patterns**

#### **🚨 "Second send fails with CORS error"**
- **Cause**: Missing `range-unit` in Edge Function CORS headers
- **Fix**: Add `range-unit` to `Access-Control-Allow-Headers`

#### **🚨 "Reactions freeze/stutter the UI"**  
- **Cause**: `useMessageReactions` effect resubscribes on every reaction change
- **Fix**: Remove `reactions` and `queryKey` from effect dependencies

#### **🚨 "Inline replies do nothing"**
- **Cause**: Usually collateral damage from CORS failures
- **Fix**: Fix CORS → sends succeed → replies work

#### **🚨 "Channel constantly reconnecting"**
- **Cause**: Unstable subscription dependencies or hook IDs
- **Fix**: Use `useRef` for hook IDs, stable dependencies only

#### **🚨 "Messages show but reactions don't work"**
- **Cause**: Missing database migrations or RLS policy issues
- **Fix**: Apply P2P migrations, check RLS policies

### 🔧 **Quick Debug Commands**

```bash
# Check if P2P migrations are applied
npm run check-migration-status

# Test Edge Function CORS
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: range-unit" \
  https://your-project.supabase.co/functions/v1/send-message

# Monitor realtime subscriptions
# Look for "Cleaning up channel" followed immediately by "Creating subscription" = BAD

# Check for stable hook IDs
# Look for same channel being subscribed to multiple times = BAD
```

### 🎯 **Success Indicators**

- ✅ Messages send instantly without CORS errors
- ✅ Reactions appear immediately and persist  
- ✅ No "Cleaning up channel" → "Creating subscription" loops in console
- ✅ Typing indicators work smoothly
- ✅ Thread search returns results quickly
- ✅ No subscription timeout errors
- ✅ UI never freezes during interactions

---

**Last Updated**: January 2025  
**Status**: ✅ All fixes applied and tested

## 📋 Copy This Checklist

Save this checklist in your project root and reference it whenever you encounter messaging issues. Most problems fall into these patterns and can be quickly diagnosed using this guide.