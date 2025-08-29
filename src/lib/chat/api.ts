// src/lib/chat/api.ts
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client'
import { supaFn } from '@/lib/supaFn'
import type { Database } from '@/integrations/supabase/types'
import type { Json, Row, Insert, Update } from '@/types/util'

/** Public message DTO used by UI */
export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string | null
  metadata: Json | null
  reply_to_id: string | null
  message_type?: 'text' | 'image' | 'voice' | 'file'
  status?: string
  created_at: string
  reactions?: Record<string, string[]>
}

export type Surface = 'dm' | 'floq' | 'plan'
export const PAGE_SIZE = 40

/** ==== RPC Types (from generated Database types) ==== */

type SendMessageArgs =
  Database['public']['Functions']['send_message']['Args']
type SendMessageRet =
  Database['public']['Functions']['send_message']['Returns']

type ReactArgs =
  Database['public']['Functions']['react_to_message']['Args']
type ReactRet =
  Database['public']['Functions']['react_to_message']['Returns']

type CreateOrGetThreadArgs =
  Database['public']['Functions']['create_or_get_thread']['Args']
type CreateOrGetThreadRet =
  Database['public']['Functions']['create_or_get_thread']['Returns']

type MarkThreadReadArgs =
  Database['public']['Functions']['mark_thread_read_enhanced']['Args']
type MarkThreadReadRet =
  Database['public']['Functions']['mark_thread_read_enhanced']['Returns']

/** ==== Tables Types ==== */
type ThreadRow = Row<'direct_threads'>
type ThreadInsert = Insert<'direct_threads'>
type ThreadUpdate = Update<'direct_threads'>

/** ==== RPC wrappers (typed) ==== */

export const rpc_sendMessage = (payload: SendMessageArgs) =>
  supabase.rpc('send_message', payload).returns<SendMessageRet>()

export const rpc_reactToMsg = (payload: ReactArgs) =>
  supabase.rpc('react_to_message', payload).returns<ReactRet>()

/**
 * Get or create a 1:1 thread for (profileIdA, profileIdB).
 * Tries typed RPC first, then manual lookup, finally manual insert.
 */
export async function getOrCreateThread(
  profileIdA: string,
  profileIdB: string
): Promise<string> {
  // normalize pair ordering (A < B)
  const [low, high] = profileIdA < profileIdB
    ? [profileIdA, profileIdB]
    : [profileIdB, profileIdA]

  // 1) Preferred: typed RPC
  try {
    const { data: threadId, error } = await supabase
      .rpc('create_or_get_thread', {
        p_user_a: low,
        p_user_b: high,
      } satisfies CreateOrGetThreadArgs)
      .returns<CreateOrGetThreadRet>()

    if (!error && threadId) {
      // Many setups return a UUID string; if your RPC returns an object, adjust here.
      return String(threadId)
    }
    if (error) {
      // fall through to manual path
      // console.warn('[getOrCreateThread] RPC failed:', error)
    }
  } catch {
    // ignore, continue to fallback
  }

  // 2) Manual: search for a thread with the same pair
  // Build an OR with both orderings (member_a=a, member_b=b) OR (a=b, b=a)
  const pairFilter = [
    `and(member_a_profile_id.eq.${low},member_b_profile_id.eq.${high})`,
    `and(member_a_profile_id.eq.${high},member_b_profile_id.eq.${low})`,
  ].join(',')

  const { data: existingThread } = await supabase
    .from('direct_threads')
    .select('id')
    .or(pairFilter)
    .limit(1)
    .single()
    .returns<Pick<ThreadRow, 'id'>>()

  if (existingThread?.id) return existingThread.id

  // 3) Manual insert (requires RLS policy to allow)
  const nowIso = new Date().toISOString()
  const insert: ThreadInsert = {
    member_a: low as ThreadInsert['member_a'],
    member_b: high as ThreadInsert['member_b'],
    member_a_profile_id: low as ThreadInsert['member_a_profile_id'],
    member_b_profile_id: high as ThreadInsert['member_b_profile_id'],
    created_at: nowIso as ThreadInsert['created_at'],
    last_message_at: nowIso as ThreadInsert['last_message_at'],
    unread_a: 0 as ThreadInsert['unread_a'],
    unread_b: 0 as ThreadInsert['unread_b'],
  }

  const { data: newThread, error: createError } = await supabase
    .from('direct_threads')
    .insert([insert] as ThreadInsert[])
    .select('id')
    .single()
    .returns<Pick<ThreadRow, 'id'>>()

  if (createError) {
    throw new Error(`Failed to create thread: ${createError.message}`)
  }
  return newThread.id
}

/**
 * Mark a thread as read for the current user.
 * Tries typed RPC -> edge function -> manual direct_threads update.
 */
export async function rpc_markThreadRead(
  threadId: string,
  surface: Surface = 'dm'
) {
  // current user
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('User not authenticated')

  // 1) Preferred: typed RPC
  const { error: rpcError } = await supabase
    .rpc('mark_thread_read_enhanced', {
      p_thread_id: threadId,
      p_profile_id: userId,
    } satisfies MarkThreadReadArgs)
    .returns<MarkThreadReadRet>()
  if (!rpcError) return

  // 2) Edge function fallback
  try {
    const { data: sess } = await supabase.auth.getSession()
    const token = sess.session?.access_token
    if (token) {
      const result = await supaFn('mark-thread-read', token, {
        surface,
        thread_id: threadId,
        profile_id: userId,
      })
      if (result.ok) return
    }
  } catch {
    // swallow and try manual
  }

  // 3) Manual update (RLS must allow)
  const { data: thread, error: fetchError } = await supabase
    .from('direct_threads')
    .select('member_a_profile_id, member_b_profile_id')
    .eq('id', threadId)
    .single()
    .returns<Pick<ThreadRow, 'member_a_profile_id' | 'member_b_profile_id'>>()

  if (fetchError) throw new Error(`Failed to fetch thread: ${fetchError.message}`)

  const isMemberA = thread.member_a_profile_id === userId

  const patch: Partial<ThreadUpdate> = isMemberA
    ? {
        last_read_at_a: new Date().toISOString() as ThreadUpdate['last_read_at_a'],
        unread_a: 0 as ThreadUpdate['unread_a'],
      }
    : {
        last_read_at_b: new Date().toISOString() as ThreadUpdate['last_read_at_b'],
        unread_b: 0 as ThreadUpdate['unread_b'],
      }

  const { error: updateError } = await supabase
    .from('direct_threads')
    .update(patch as ThreadUpdate)
    .eq('id', threadId)

  if (updateError) throw new Error(`Failed to update thread: ${updateError.message}`)
}

/**
 * Upload chat media via Supabase Edge Function.
 * Returns typed JSON { data, error } – error is always null when resolved, throws otherwise.
 */
export const fn_uploadChatMedia = async <T = unknown>(
  body: Record<string, unknown>
): Promise<{ data: T; error: null }> => {
  const { data: sess } = await supabase.auth.getSession()
  const token = sess.session?.access_token
  if (!token) throw new Error('No auth session')

  const url = `${SUPABASE_URL}/functions/v1/upload-chat-media`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to upload media: ${res.status} ${errorText}`)
  }

  const data = (await res.json()) as T
  return { data, error: null }
}
