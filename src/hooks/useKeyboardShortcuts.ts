import { useEffect, useCallback } from 'react'
import { useHapticFeedback } from './useHapticFeedback'

interface KeyboardShortcutsConfig {
  onAddStop?: () => void
  onDeleteStop?: () => void
  onExecutePlan?: () => void
  onToggleChat?: () => void
  onToggleSettings?: () => void
  onSavePlan?: () => void
  onUndoAction?: () => void
  onRedoAction?: () => void
  onSelectAll?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onSearch?: () => void
  onHelp?: () => void
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { socialHaptics } = useHapticFeedback()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event
    const isModPressed = ctrlKey || metaKey

    // Prevent shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return
    }

    let handled = false

    // Core planning shortcuts
    if (key === 'n' && !isModPressed && !shiftKey && !altKey) {
      config.onAddStop?.()
      socialHaptics.gestureConfirm()
      handled = true
    }
    
    if (key === 'Delete' || key === 'Backspace') {
      config.onDeleteStop?.()
      socialHaptics.gestureConfirm()
      handled = true
    }

    if (key === 'Enter' && isModPressed) {
      config.onExecutePlan?.()
      socialHaptics.vibeMatch()
      handled = true
    }

    // UI shortcuts
    if (key === 'c' && !isModPressed && !shiftKey && !altKey) {
      config.onToggleChat?.()
      socialHaptics.gestureConfirm()
      handled = true
    }

    if (key === ',' && isModPressed) {
      config.onToggleSettings?.()
      handled = true
    }

    // Standard shortcuts
    if (key === 's' && isModPressed && !shiftKey) {
      config.onSavePlan?.()
      socialHaptics.gestureConfirm()
      handled = true
    }

    if (key === 'z' && isModPressed && !shiftKey) {
      config.onUndoAction?.()
      handled = true
    }

    if (key === 'z' && isModPressed && shiftKey) {
      config.onRedoAction?.()
      handled = true
    }

    if (key === 'a' && isModPressed) {
      config.onSelectAll?.()
      handled = true
    }

    if (key === 'c' && isModPressed) {
      config.onCopy?.()
      handled = true
    }

    if (key === 'v' && isModPressed) {
      config.onPaste?.()
      handled = true
    }

    if (key === 'f' && isModPressed) {
      config.onSearch?.()
      handled = true
    }

    if (key === '?' && !isModPressed) {
      config.onHelp?.()
      handled = true
    }

    // Prevent browser default for handled shortcuts
    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [config, socialHaptics])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Return shortcut info for help display
  return {
    shortcuts: [
      { key: 'N', description: 'Add new stop' },
      { key: 'Del', description: 'Delete selected stop' },
      { key: 'Ctrl+Enter', description: 'Execute plan' },
      { key: 'C', description: 'Toggle chat' },
      { key: 'Ctrl+S', description: 'Save plan' },
      { key: 'Ctrl+Z', description: 'Undo' },
      { key: 'Ctrl+Shift+Z', description: 'Redo' },
      { key: 'Ctrl+A', description: 'Select all' },
      { key: 'Ctrl+C', description: 'Copy' },
      { key: 'Ctrl+V', description: 'Paste' },
      { key: 'Ctrl+F', description: 'Search' },
      { key: '?', description: 'Show help' }
    ]
  }
}