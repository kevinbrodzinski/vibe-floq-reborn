import React from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import type { MentionCandidate } from '@/hooks/useMentionAutocomplete'

interface Props {
  open: boolean
  top: number
  left: number
  items: MentionCandidate[]
  highlight: number
  onSelect: (c: MentionCandidate) => void
}

export const MentionAutocompleteMenu: React.FC<Props> = ({
  open,
  top,
  left,
  items,
  highlight,
  onSelect,
}) => (
  <AnimatePresence>
    {open && (
      <motion.ul
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        style={{ top, left }}
        className="absolute z-50 w-56 rounded-xl bg-surface p-1 shadow-xl backdrop-blur-md"
      >
        {items.map((c, i) => (
          <li
            key={`${c.type}-${c.id}`}
            className={clsx(
              'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10',
              i === highlight && 'bg-primary/20',
            )}
            onMouseDown={e => {
              e.preventDefault() // keep focus
              onSelect(c)
            }}
          >
            <img
              src={c.avatar_url ?? '/placeholder.svg'}
              alt={c.tag}
              className="h-6 w-6 rounded-full object-cover"
            />
            <span className="truncate">{c.label}</span>
          </li>
        ))}
      </motion.ul>
    )}
  </AnimatePresence>
)