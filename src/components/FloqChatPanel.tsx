import { useFloqMessages, useSendFloqMessage } from '@/hooks/useFloqMessages'

export function FloqChatPanel({ floqId }: { floqId: string }) {
  const { data, fetchNextPage, hasNextPage } = useFloqMessages(floqId)
  const { mutate: send } = useSendFloqMessage()
  const msgs = (data?.pages.flat() ?? []) as Array<{
    id: string;
    body: string;
    created_at: string;
    sender_id: string;
  }>

  return (
    <div className="flex h-full flex-col">
      <ul
        className="flex-1 overflow-y-auto flex flex-col-reverse gap-2 p-4"
        onScroll={(e) => {
          if (e.currentTarget.scrollTop === 0 && hasNextPage) fetchNextPage()
        }}
      >
        {msgs.map((m) => (
          <li key={m.id} className="rounded-xl bg-border/10 p-2">
            <span className="text-xs opacity-60">
              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <p>{m.body}</p>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const body = (e.currentTarget.elements.namedItem('m') as HTMLInputElement).value.trim()
          if (body) send({ floqId, body })
          e.currentTarget.reset()
        }}
        className="border-t border-border flex"
      >
        <input
          name="m"
          placeholder="message…"
          className="flex-1 bg-transparent p-3 outline-none"
        />
        <button type="submit" className="px-4 text-primary font-semibold">
          Send
        </button>
      </form>
    </div>
  )
}