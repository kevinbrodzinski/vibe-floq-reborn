import { useState } from 'react'
import { Smile } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface EmojiPickerProps {
  selected?: string | null
  onChange: (emoji: string | null) => void
  className?: string
  icon?: React.ReactNode
}

const EMOJI_OPTIONS = [
  '👍', '👎', '🤔', '❤️', '😍', '😎', '🔥', '💯',
  '😂', '😭', '🙄', '😴', '🤩', '🥳', '🤯', '🤗'
]

export function EmojiPicker({ 
  selected, 
  onChange, 
  className,
  icon = <Smile className="w-4 h-4" />
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  const handleEmojiSelect = (emoji: string) => {
    onChange(selected === emoji ? null : emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'p-2 h-auto',
            selected && 'bg-primary/10 text-primary',
            className
          )}
        >
          {selected || icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_OPTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className={cn(
                'p-1 h-8 w-8 text-lg hover:bg-muted',
                selected === emoji && 'bg-primary/10'
              )}
              onClick={() => handleEmojiSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}