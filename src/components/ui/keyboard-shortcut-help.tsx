
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { zIndex } from '@/constants/z'

interface ShortcutItem {
  key: string
  description: string
  category?: string
}

interface KeyboardShortcutHelpProps {
  shortcuts: ShortcutItem[]
  isVisible: boolean
  onClose: () => void
  className?: string
}

export function KeyboardShortcutHelp({
  shortcuts,
  isVisible,
  onClose,
  className
}: KeyboardShortcutHelpProps) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutItem[]>)

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            {...zIndex('modal')}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "bg-card border rounded-2xl shadow-2xl",
              "w-full max-w-lg max-h-[80vh] overflow-hidden",
              className
            )}
            {...zIndex('modal')}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Keyboard size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut) => (
                        <div
                          key={`${shortcut.key}-${shortcut.description}`}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-sm">{shortcut.description}</span>
                          <KeyboardKey keys={shortcut.key} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                Press <KeyboardKey keys="?" size="sm" /> anytime to show this help
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Component for displaying keyboard keys
function KeyboardKey({ 
  keys, 
  size = 'default' 
}: { 
  keys: string
  size?: 'sm' | 'default'
}) {
  const keyParts = keys.split('+').map(key => key.trim())
  
  return (
    <div className="flex items-center gap-1">
      {keyParts.map((key, index) => (
        <div key={index} className="flex items-center gap-1">
          <kbd className={cn(
            "inline-flex items-center justify-center rounded border border-border bg-muted font-mono font-medium text-muted-foreground",
            size === 'sm' ? "px-1.5 py-0.5 text-xs min-w-[20px] h-5" : "px-2 py-1 text-xs min-w-[24px] h-6"
          )}>
            {key === 'Ctrl' && (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')}
            {key === 'Shift' && '⇧'}
            {key === 'Alt' && (navigator.platform.includes('Mac') ? '⌥' : 'Alt')}
            {key === 'Enter' && '↵'}
            {key === 'Backspace' && '⌫'}
            {key === 'Delete' && '⌦'}
            {!['Ctrl', 'Shift', 'Alt', 'Enter', 'Backspace', 'Delete'].includes(key) && key}
          </kbd>
          {index < keyParts.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </div>
      ))}
    </div>
  )
}
