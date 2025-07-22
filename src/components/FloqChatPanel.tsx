import { useFloqMessages, useSendFloqMessage } from '@/hooks/useFloqMessages'
import { RichText } from '@/components/chat/RichText'
import { supabase } from '@/integrations/supabase/client'
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

  return (
    <div className="flex h-full flex-col">
      {/* ---------- list ---------- */}
      <ul
        className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto p-4"
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
                'rounded-xl p-3',
                mine ? 'bg-primary/10 self-end' : 'bg-border/10'
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                {!mine && (
                  <img
                    src={m.sender?.avatar_url || '/placeholder.svg'}
                    alt={name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                )}
                <span>{name}</span>
                <span className="pl-2">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="whitespace-pre-line break-words">
                <RichText text={m.body} />
              </p>
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
    </div>
  )
}