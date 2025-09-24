import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { VibePill } from '@/components/floq/VibePill'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Tag, X } from 'lucide-react'
import { FriendPicker } from './FriendPicker'
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends'

interface PlanDetails {
  title: string
  description?: string
  vibe_tag?: string
}

interface Props {
  draft: PlanDetails
  onChange: (details: PlanDetails) => void
  onNext: () => void
  onBack?: () => void
  onCreateFloq?: () => void
}

const vibeOptions = [
  { label: 'Chill', value: 'chill' },
  { label: 'Hype', value: 'hype' },
  { label: 'Curious', value: 'curious' },
  { label: 'Social', value: 'social' },
  { label: 'Solo', value: 'solo' },
  { label: 'Romantic', value: 'romantic' },
  { label: 'Weird', value: 'weird' },
  { label: 'Down', value: 'down' },
  { label: 'Flowing', value: 'flowing' },
  { label: 'Open', value: 'open' },
]

export function DetailsStep({ draft, onChange, onNext, onBack, onCreateFloq }: Props) {
  const [details, setDetails] = useState(draft)

  const updateField = <K extends keyof PlanDetails>(field: K, value: PlanDetails[K]) => {
    const updated = { ...details, [field]: value }
    setDetails(updated)
    onChange(updated)
  }

  const handleVibeToggle = (vibe: string) => {
    const newVibe = details.vibe_tag === vibe ? '' : vibe
    updateField('vibe_tag', newVibe)
  }

  const handleNext = () => {
    if (!details.title.trim()) return
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Plan Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-medium">
          Plan Title *
        </Label>
        <Input
          id="title"
          placeholder="What's the plan?"
          value={details.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="text-lg"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Tell us more about what you're planning..."
          value={details.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
        />
      </div>


      {/* Vibe Tag */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Vibe
        </Label>
        <div className="flex flex-wrap gap-2">
          {vibeOptions.map((option) => (
            <div
              key={option.value}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                details.vibe_tag === option.value ? 'ring-2 ring-primary ring-offset-2' : 'opacity-70 hover:opacity-100'
              }`}
              onClick={() => handleVibeToggle(option.value)}
            >
              <VibePill vibe={option.value as any} />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          This helps Nova AI suggest better stops for your plan
        </p>
      </div>

      {/* Next Button */}
      <Button 
        onClick={handleNext} 
        className="w-full" 
        size="lg"
        disabled={!details.title.trim()}
      >
        Continue to Floqs
      </Button>
    </div>
  )
}