import { useFloqMessages, useSendFloqMessage } from '@/hooks/useFloqMessages'
import { supabase } from '@/integrations/supabase/client'
import { highlightMentions } from '@/utils/highlightMentions'
import { AnimatePresence } from 'framer-motion'
import { useMentionPopover } from '@/hooks/useMentionPopover'
import { MentionPopover } from '@/components/chat/MentionPopover'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { MentionAutocompleteMenu } from '@/components/chat/MentionAutocompleteMenu'
import clsx from 'clsx'
import { useEffect, useState, useRef } from 'react'

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

  // Autocomplete state
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Autocomplete hook
  const ac = useMentionAutocomplete({
    onInsert: c => {
      if (!inputRef.current) return
      const i = inputRef.current
      const { selectionStart } = i
      const text = i.value
      /* replace "@query" immediately before caret with "@tag " */
      const match = /@[\w-]*$/.exec(text.slice(0, selectionStart ?? 0))
      if (!match) return
      const start = match.index
      const before = text.slice(0, start)
      const after = text.slice(selectionStart ?? 0)
      i.value = `${before}@${c.tag} ${after}`
      /* move caret */
      const pos = before.length + c.tag.length + 2
      i.setSelectionRange(pos, pos)
      ac.close()
    },
  })

  // Track cursor position to position the menu
  const updateMenuPos = () => {
    if (!inputRef.current) return
    const { top, left } = inputRef.current.getBoundingClientRect()
    setMenuPos({ top: top - 8, left: left + 8 }) // tweak offsets
  }

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
          const textarea = inputRef.current
          if (!textarea) return
          const body = textarea.value.trim()
          if (body) send({ floqId, body })
          textarea.value = ''
          ac.close()
        }}
        className="flex border-t border-border"
      >
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="message…"
            className="min-h-[40px] max-h-36 w-full resize-none bg-transparent p-3 outline-none"
            onKeyDown={ac.onKeyDown}
            onInput={e => {
              const val = (e.target as HTMLTextAreaElement).value
              const sel = (e.target as HTMLTextAreaElement).selectionStart ?? 0
              const match = /@([\w-]*)$/.exec(val.slice(0, sel))
              if (match) {
                ac.setQuery(match[1])
                updateMenuPos()
              } else {
                ac.setQuery('')
                ac.close()
              }
            }}
          />

          <MentionAutocompleteMenu
            open={ac.open}
            top={menuPos.top}
            left={menuPos.left}
            items={ac.items}
            highlight={ac.index}
            onSelect={ac.onInsert}
          />
        </div>
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