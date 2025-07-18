import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw,
  Search,
  Maximize2,
  Keyboard
} from 'lucide-react'
import { AfterglowMoment } from '@/hooks/useAfterglowData'
import { formatMomentTime } from '@/utils/afterglowHelpers'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'

interface TimelineNavigationProps {
  moments: AfterglowMoment[]
  currentIndex: number
  onJumpToMoment: (index: number) => void
  onPlayPause?: () => void
  isPlaying?: boolean
  containerRef?: React.RefObject<HTMLDivElement>
}

export function TimelineNavigation({
  moments,
  currentIndex,
  onJumpToMoment,
  onPlayPause,
  isPlaying = false,
  containerRef
}: TimelineNavigationProps) {
  const { toast } = useToast()
  const [showKeyboardHints, setShowKeyboardHints] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'h':
          event.preventDefault()
          if (currentIndex > 0) {
            onJumpToMoment(currentIndex - 1)
          }
          break
          
        case 'ArrowRight':
        case 'l':
          event.preventDefault()
          if (currentIndex < moments.length - 1) {
            onJumpToMoment(currentIndex + 1)
          }
          break
          
        case 'Home':
        case 'g':
          event.preventDefault()
          onJumpToMoment(0)
          break
          
        case 'End':
        case 'G':
          event.preventDefault()
          onJumpToMoment(moments.length - 1)
          break
          
        case ' ':
          event.preventDefault()
          onPlayPause?.()
          break
          
        case '/':
          event.preventDefault()
          setShowSearch(true)
          setTimeout(() => searchInputRef.current?.focus(), 100)
          break
          
        case 'Escape':
          setShowSearch(false)
          setSearchQuery('')
          break
          
        case '?':
          event.preventDefault()
          setShowKeyboardHints(!showKeyboardHints)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, moments.length, onJumpToMoment, onPlayPause, showKeyboardHints])

  // Touch gesture support
  useEffect(() => {
    if (!containerRef?.current) return

    let startX = 0
    let startY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      isDragging = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) {
        const deltaX = Math.abs(e.touches[0].clientX - startX)
        const deltaY = Math.abs(e.touches[0].clientY - startY)
        
        // Only start dragging if horizontal movement is dominant
        if (deltaX > deltaY && deltaX > 10) {
          isDragging = true
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return

      const deltaX = e.changedTouches[0].clientX - startX
      const threshold = 50

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && currentIndex > 0) {
          // Swipe right - go to previous moment
          onJumpToMoment(currentIndex - 1)
        } else if (deltaX < 0 && currentIndex < moments.length - 1) {
          // Swipe left - go to next moment
          onJumpToMoment(currentIndex + 1)
        }
      }
    }

    const container = containerRef.current
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, currentIndex, moments.length, onJumpToMoment])

  // Search functionality
  const filteredMoments = moments.filter((moment, index) => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      moment.title.toLowerCase().includes(query) ||
      moment.description?.toLowerCase().includes(query) ||
      moment.moment_type.toLowerCase().includes(query) ||
      index.toString().includes(query)
    )
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    if (query && filteredMoments.length > 0) {
      const firstMatch = moments.findIndex(moment => 
        moment.title.toLowerCase().includes(query.toLowerCase()) ||
        moment.description?.toLowerCase().includes(query.toLowerCase()) ||
        moment.moment_type.toLowerCase().includes(query.toLowerCase())
      )
      
      if (firstMatch !== -1) {
        onJumpToMoment(firstMatch)
      }
    }
  }

  const currentMoment = moments[currentIndex]
  const progress = (currentIndex / Math.max(moments.length - 1, 1)) * 100

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t">
      <div className="container max-w-4xl mx-auto px-4 py-4">
        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-4 p-3 bg-card rounded-lg border"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search moments by title, description, or type..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              
              {searchQuery && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {filteredMoments.length} of {moments.length} moments match
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main navigation */}
        <div className="space-y-4">
          {/* Progress bar with scrubbing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatMomentTime(currentMoment?.timestamp || '')}</span>
              <span>{currentIndex + 1} / {moments.length}</span>
              <span>
                {moments[moments.length - 1] ? formatMomentTime(moments[moments.length - 1].timestamp) : ''}
              </span>
            </div>
            
            <Slider
              value={[currentIndex]}
              max={moments.length - 1}
              step={1}
              onValueChange={([value]) => onJumpToMoment(value)}
              className="w-full"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToMoment(0)}
                disabled={currentIndex === 0}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToMoment(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              {onPlayPause && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPlayPause}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJumpToMoment(Math.min(moments.length - 1, currentIndex + 1))}
                disabled={currentIndex === moments.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Current moment info */}
            <div className="flex-1 mx-4">
              {currentMoment && (
                <div className="text-center">
                  <div className="font-medium text-sm truncate">{currentMoment.title}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {currentMoment.moment_type.replace('_', ' ')}
                  </Badge>
                </div>
              )}
            </div>

            {/* Additional controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeyboardHints(!showKeyboardHints)}
              >
                <Keyboard className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Keyboard hints */}
        <AnimatePresence>
          {showKeyboardHints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-muted/50 rounded-lg"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><kbd className="px-1 py-0.5 bg-background rounded">←→</kbd> Navigate</div>
                <div><kbd className="px-1 py-0.5 bg-background rounded">Space</kbd> Play/Pause</div>
                <div><kbd className="px-1 py-0.5 bg-background rounded">Home</kbd> First</div>
                <div><kbd className="px-1 py-0.5 bg-background rounded">End</kbd> Last</div>
                <div><kbd className="px-1 py-0.5 bg-background rounded">/</kbd> Search</div>
                <div><kbd className="px-1 py-0.5 bg-background rounded">?</kbd> Help</div>
                <div><kbd className="px-1 py-0.5 bg-background rounded">Esc</kbd> Close</div>
                <div className="text-muted-foreground">Swipe gestures</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}