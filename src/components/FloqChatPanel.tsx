import { useMessages } from '@/hooks/messaging/useMessages'
import { useSendMessage } from '@/hooks/messaging/useSendMessage'
import { supabase } from '@/integrations/supabase/client'
import { renderMentions } from '@/utils/mentions'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMentionPopover } from '@/hooks/useMentionPopover'
import { MentionPopover } from '@/components/chat/MentionPopover'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { MentionAutocompleteMenu } from '@/components/chat/MentionAutocompleteMenu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Send, 
  Smile, 
  Image, 
  MapPin, 
  Heart, 
  ThumbsUp, 
  MessageCircle,
  Check,
  CheckCheck,
  Clock,
  Reply,
  MoreHorizontal,
  X
} from 'lucide-react'
import { useEffect, useState, useRef, useMemo } from 'react'

export function FloqChatPanel({ floqId }: { floqId: string }) {
  const messages = useMessages(floqId, 'floq')
  const { mutate: send } = useSendMessage('floq')
  
  // Get current user for styling own messages
  const [me, setMe] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [showThread, setShowThread] = useState<string | null>(null)
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setMe(user?.id || null)
    }
    getUser()
  }, [])

  const msgs = useMemo(() => {
    const seen = new Set<string>();
    const flat = (messages.data?.pages.flat() ?? []).reverse(); // Reverse to show oldest→newest, then flex-col-reverse shows newest at bottom

    return flat.filter((m) => {
      const key =
        m.status === 'sending' && m.metadata?.client_id
          ? `tmp-${m.metadata.client_id}`
          : m.id;

      if (seen.has(key)) return false; // skip duplicate
      seen.add(key);
      return true;
    });
  }, [messages.data])
  
  // Mention popover hook
  const { target, open, close } = useMentionPopover()

  // Autocomplete state
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [inputValue, setInputValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (msgs.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container')
        if (messagesContainer) {
          messagesContainer.scrollTop = 0 // Since we use flex-col-reverse, scrollTop 0 shows latest messages
        }
      }, 100)
    }
  }, [msgs.length])

  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('.messages-container')
    if (messagesContainer) {
      messagesContainer.scrollTop = 0
    }
  }

  const ac = useMentionAutocomplete({
    onInsert: (candidate) => {
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
      i.value = `${before}@${candidate.tag} ${after}`
      /* move caret */
      const pos = before.length + candidate.tag.length + 2
      i.setSelectionRange(pos, pos)
      setInputValue(i.value)
      ac.close()
    },
  })

  const updateMenuPos = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    // TODO: Send typing indicator when available
    
    // Mention autocomplete
    const sel = e.target.selectionStart ?? 0
    const match = /@([\w-]*)$/.exec(value.slice(0, sel))
    if (match) {
      ac.setQuery(match[1])
      updateMenuPos()
    } else {
      ac.setQuery('')
      ac.close()
    }
  }

  // Handle message reactions
  const handleReaction = (messageId: string, reaction: string) => {
    // TODO: Implement reactions when available
    console.log('React to message:', messageId, reaction)
  }

  // Handle reply to message
  const handleReply = (message: any) => {
    setReplyingTo(message)
    inputRef.current?.focus()
  }

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null)
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`
    return date.toLocaleDateString()
  }

  // Get read receipt status
  const getReadStatus = (messageId: string, isOwn: boolean) => {
    if (!isOwn) return null
    // TODO: Implement read receipts when available
    return <Clock className="w-3 h-3 text-muted-foreground" />
  }

  // Mark message as read when it comes into view
  useEffect(() => {
    if (!me || msgs.length === 0) return
    
    const lastMessage = msgs[0] // Messages are in reverse order
    if (lastMessage && lastMessage.sender_id !== me) {
      // TODO: Implement read receipts when available
      console.log('Mark as read:', lastMessage.id)
    }
  }, [msgs, me])

  // Render reply preview
  const renderReplyPreview = () => {
    if (!replyingTo) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-muted/20 border-l-2 border-primary/50 p-3 rounded-lg mb-3"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Reply className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              Replying to {replyingTo.sender?.display_name || replyingTo.sender?.username || 'Someone'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelReply}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2 break-words">
          {replyingTo.body || 'This message was deleted'}
        </div>
      </motion.div>
    )
  }

  // Render message with reply context
  const renderMessage = (m: any) => {
    const mine = m.sender_id === me
    const name = m.sender?.display_name || m.sender?.username || 'Someone'
    const reactions = [] // TODO: Get from message reactions when available

    const key = m.status === 'sending' && m.metadata?.client_id
      ? `tmp-${m.metadata.client_id}`
      : m.id;

    return (
      <motion.li
        key={key}
        className={cn(
          'group relative',
          mine ? 'ml-auto' : 'mr-auto'
        )}
      >
        <div className={cn(
          'flex gap-3 max-w-[75%]',
          mine && 'flex-row-reverse'
        )}>
          {!mine && (
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={m.sender?.avatar_url} />
              <AvatarFallback className="text-xs">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={cn(
            'flex flex-col',
            mine && 'items-end'
          )}>
            {!mine && (
              <span className="text-xs text-muted-foreground mb-1 px-1">
                {name}
              </span>
            )}
            
            {/* Reply context */}
            {m.reply_to && (
              <div className={cn(
                'text-xs text-muted-foreground mb-1 px-1 border-l-2 border-muted pl-2',
                mine && 'text-right'
              )}>
                Replying to {m.reply_to.sender?.display_name || m.reply_to.sender?.username || 'Someone'}
              </div>
            )}
            
            <div className={cn(
              'relative rounded-2xl px-4 py-2 break-words max-w-full',
              mine 
                ? 'bg-primary text-primary-foreground rounded-br-md' 
                : 'bg-muted rounded-bl-md'
            )}>
              {/* Message content */}
              <p className="text-sm leading-relaxed">
                {m.content || m.body || ''}
              </p>
              
              {/* Message footer */}
              <div className={cn(
                'flex items-center gap-1 mt-1',
                mine ? 'justify-end' : 'justify-start'
              )}>
                <span className="text-[10px] opacity-60">
                  {formatTime(m.created_at)}
                </span>
                {getReadStatus(m.id, mine)}
              </div>
            </div>
            
            {/* Reactions */}
            {reactions.length > 0 && (
              <div className={cn(
                'flex gap-1 mt-1',
                mine ? 'justify-end' : 'justify-start'
              )}>
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  ❤️ {reactions.length}
                </Badge>
              </div>
            )}

            {/* Thread indicator */}
            {m.thread_count && m.thread_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground mt-1"
                onClick={() => setShowThread(showThread === m.id ? null : m.id)}
              >
                {m.thread_count} replies
              </Button>
            )}
          </div>
        </div>
        
        {/* Message actions (hover) */}
        <div className={cn(
          'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          mine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
        )}>
          <div className="flex gap-1 bg-background border rounded-full p-1 shadow-lg">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleReply(m)}
            >
              <Reply className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleReaction(m.id, 'heart')}
            >
              ❤️
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleReaction(m.id, 'thumbsup')}
            >
              👍
            </Button>
          </div>
        </div>
      </motion.li>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* ---------- messages container ---------- */}
      <div className="flex-1 overflow-hidden relative">
        <ul
          className="messages-container h-full flex flex-col-reverse gap-3 overflow-y-auto p-4 pb-6"
          onClick={(e) => {
            const el = e.target as HTMLElement;
            const tag = el.dataset.tag;
            if (tag) {
              open({ tag, x: e.clientX, y: e.clientY });
            }
          }}
          onScroll={(e) => {
            const target = e.currentTarget;
            // Show scroll-to-bottom button if scrolled up (scrollTop > 100)
            setShowScrollToBottom(target.scrollTop > 100);
            
            if (target.scrollTop === 0 && messages.hasNextPage) messages.fetchNextPage()
          }}
        >
          {msgs.map(renderMessage)}
          
          {/* TODO: Typing indicators when available */}
        </ul>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 h-10 w-10 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <MessageCircle className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- composer (fixed at bottom) ---------- */}
      <div className="border-t border-border bg-background shadow-lg">
        {/* Reply preview */}
        <AnimatePresence>
          {renderReplyPreview()}
        </AnimatePresence>
        
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const textarea = inputRef.current
            if (!textarea) return
            const body = textarea.value.trim()
            if (body) {
              send({ 
                threadId: floqId, 
                content: body
              })
              textarea.value = ''
              setInputValue('')
              setReplyingTo(null)
            }
            ac.close()
          }}
          className="flex p-3 gap-2 bg-background"
        >
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={replyingTo ? `Reply to ${replyingTo.sender?.display_name || replyingTo.sender?.username || 'Someone'}...` : "Message..."}
              value={inputValue}
              onChange={handleInputChange}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="min-h-[40px] max-h-36 w-full resize-none bg-transparent outline-none text-sm"
              onKeyDown={ac.onKeyDown}
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
          
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 w-10 p-0"
            >
              <Smile className="h-5 w-5" />
            </Button>
            
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 w-10 p-0"
            >
              <Image className="h-5 w-5" />
            </Button>
            
            <Button
              type="submit"
              size="sm"
              className="h-10 w-10 p-0 bg-primary text-primary-foreground"
              disabled={!inputValue.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>

      {/* Mention popover portal */}
      <AnimatePresence>
        {target && <MentionPopover target={target} onClose={close} />}
      </AnimatePresence>
    </div>
  )
}