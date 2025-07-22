import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface MentionCandidate {
  id: string
  tag: string          // username / venue-slug / plan-id
  label: string        // "Kevin M. – @kevin"
  avatar_url: string | null
  type: 'user' | 'venue' | 'plan'
}

interface Params {
  /** called when the user hits <enter>/<tab> or clicks a candidate */
  onInsert: (candidate: MentionCandidate) => void
}

/**
 * Handles:
 *  – parsing the current word after "@"
 *  – debounced search against users + venues + plans
 *  – keyboard navigation
 *  – exposing UI state
 */
export const useMentionAutocomplete = ({ onInsert }: Params) => {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState('')          // raw text after @
  const [index, setIndex]         = useState(0)           // keyboard highlight
  const [items, setItems]         = useState<MentionCandidate[]>([])

  /* ------------------------------------------------ search (300 ms debounce) */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query) {
      setItems([])
      setOpen(false)
      return
    }

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const q = query.toLowerCase()

      /* ---- users --------------------------------------------------------- */
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `${q}%`)
        .limit(5)

      /* ---- venues -------------------------------------------------------- */
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .ilike('name', `${q}%`)
        .limit(5)

      /* ---- plans (id match starts-with) ---------------------------------- */
      const { data: plans } = await supabase
        .from('floq_plans')
        .select('id, title')
        .ilike('id', `${q}%`)
        .limit(5)

      const candidates: MentionCandidate[] = [
        ...(users ?? []).map(u => ({
          id: u.id,
          tag: u.username,
          label: `${u.display_name || u.username} – @${u.username}`,
          avatar_url: u.avatar_url,
          type: 'user' as const,
        })),
        ...(venues ?? []).map(v => ({
          id: v.id,
          tag: v.name.toLowerCase().replace(/\s+/g, '-'),
          label: `${v.name} – @${v.name.toLowerCase().replace(/\s+/g, '-')}`,
          avatar_url: null,
          type: 'venue' as const,
        })),
        ...(plans ?? []).map(p => ({
          id: p.id,
          tag: p.id,
          label: `${p.title ?? 'Plan'} – @${p.id.slice(0, 8)}…`,
          avatar_url: null,
          type: 'plan' as const,
        })),
      ]

      setItems(candidates)
      setIndex(0)
      setOpen(candidates.length > 0)
    }, 300)

    return () => timer.current && clearTimeout(timer.current)
  }, [query])

  /* ------------------------------------------------ keyboard navigation */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!open) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex(i => (i + 1) % items.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex(i => (i - 1 + items.length) % items.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const choice = items[index]
        if (choice) onInsert(choice)
        setOpen(false)
        setQuery('')
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [open, items, index, onInsert],
  )

  return {
    /* wiring for the input field */
    open,
    query,
    setQuery,
    onKeyDown,

    /* menu UI state */
    items,
    index,
    close: () => setOpen(false),
    onInsert,
  }
}