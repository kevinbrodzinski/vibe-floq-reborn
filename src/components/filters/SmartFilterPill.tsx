import { useState } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'
import { useNovaSnap } from '@/hooks/useNovaSnap'
import { cn } from '@/lib/utils'
import { PersonalizationSettings } from '@/components/planning/PersonalizationSettings'
import { triggerHaptic } from '@/utils/haptics'

export const SmartFilterPill = () => {
  const { preferSmartSuggestions, toggleSmartSuggestions } = useNovaSnap()
  const [open, setOpen] = useState(false)

  const handleToggle = () => {
    triggerHaptic(30) // Haptic feedback
    toggleSmartSuggestions()
  }

  const handleSettingsOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(true)
  }

  const Pill = (
    <button
      onClick={handleToggle}
      onContextMenu={(e) => {              // Long-press on mobile shows sheet
        e.preventDefault()
        setOpen(true)
      }}
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
      <ChevronDown
        className={cn(
          'h-3 w-3 transition-transform duration-200 hover:scale-110',
          open && 'rotate-180'
        )}
        onClick={handleSettingsOpen}
      />
    </button>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{Pill}</SheetTrigger>

      <SheetContent side="bottom" className="max-h-[90vh] p-0 rounded-t-2xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Personalization Settings</h2>
          <PersonalizationSettings />
        </div>
      </SheetContent>
    </Sheet>
  )
}