import { useFloqMessages, useSendFloqMessage } from '@/hooks/useFloqMessages'
import { supabase } from '@/integrations/supabase/client'
import { highlightMentions } from '@/utils/highlightMentions'
import { AnimatePresence } from 'framer-motion'
import { useMentionPopover } from '@/hooks/useMentionPopover'
import { MentionPopover } from '@/components/chat/MentionPopover'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

export function FloqChatPanel({ floqId }: { floqId: string }) {
  const { data, fetchNextPage, hasNextPage } = useFloqMessages(floqId)
  const { mutate: send } = useSendFloqMessage()
  
  // Get current user for styling own messages
  const [me, setMe] = useState<string | null>(null)
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setMe(user?.id || null)
    }
    getUser()
  }, [])

  const msgs = (data?.pages.flat() ?? [])
  
  // Mention popover hook
  const { target, open, close } = useMentionPopover()

  return (
    <div className="flex h-full flex-col">
      {/* ---------- list ---------- */}
      <ul
        className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto p-4"
        onClick={(e) => {
          const el = e.target as HTMLElement;
          const tag = el.dataset.tag;
          if (tag) {
            open({ tag, x: e.clientX, y: e.clientY });
          }
        }}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop === 0 && hasNextPage) fetchNextPage()
        }}
      >
        {msgs.map((m) => {
          const mine = m.sender_id === me
          const name = m.sender?.display_name || m.sender?.username || 'Someone'

          return (
            <li
              key={m.id}
              className={clsx(
                'rounded-xl p-3 max-w-[75%] whitespace-pre-wrap',
                mine ? 'ml-auto bg-primary/10' : 'bg-border/10'
              )}
            >
              {/* Sender chip */}
              {!mine && (
                <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                  <img
                    src={m.sender?.avatar_url ?? '/placeholder.svg'}
                    alt={name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                  <span>{name}</span>
                </div>
              )}

              {/* Rich text with mentions */}
              <p
                dangerouslySetInnerHTML={{ __html: highlightMentions(m.body) }}
              />

              {/* Timestamp */}
              <div className="mt-1 text-[10px] opacity-40">
                {new Date(m.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </li>
          )
        })}
      </ul>

      {/* ---------- composer ---------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const input = e.currentTarget.elements.namedItem('m') as HTMLInputElement
          const body = input.value.trim()
          if (body) send({ floqId, body })
          input.value = ''
        }}
        className="flex border-t border-border"
      >
        <input
          name="m"
          placeholder="message…"
          className="flex-1 bg-transparent p-3 outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-4 font-semibold text-primary hover:opacity-80"
        >
          Send
        </button>
      </form>

      {/* Mention popover portal */}
      <AnimatePresence>
        {target && <MentionPopover target={target} onClose={close} />}
      </AnimatePresence>
    </div>
  )
}