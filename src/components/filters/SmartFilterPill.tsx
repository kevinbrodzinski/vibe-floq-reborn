import { Sparkles } from 'lucide-react'
import { useNovaSnap } from '@/hooks/useNovaSnap'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/utils/haptics'

export const SmartFilterPill = () => {
  const { preferSmartSuggestions, toggleSmartSuggestions } = useNovaSnap()

  const handleToggle = () => {
    triggerHaptic(30) // Haptic feedback
    toggleSmartSuggestions()
  }

  return (
    <button
      onClick={handleToggle}
      aria-pressed={preferSmartSuggestions}
      aria-label="Toggle smart suggestions"
      className={cn(
        'flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
        'relative overflow-hidden',
        preferSmartSuggestions
          ? 'bg-white text-gray-900 shadow-md animate-pulse-once'
          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border-white/20'
      )}
    >
      <Sparkles className={cn(
        'h-3.5 w-3.5 -ml-0.5 transition-transform duration-200',
        preferSmartSuggestions && 'animate-pulse'
      )} />
      Smart
    </button>
  )
}