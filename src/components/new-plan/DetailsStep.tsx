import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Users, Tag } from 'lucide-react'

interface PlanDetails {
  title: string
  description?: string
  vibe_tag?: string
  invitedUserIds: string[]
}

interface Props {
  draft: PlanDetails
  onChange: (details: PlanDetails) => void
  onNext: () => void
  onBack?: () => void
}

const vibeOptions = [
  'chill', 'energetic', 'romantic', 'wild', 'cozy', 'deep', 'social', 'adventure'
]

export function DetailsStep({ draft, onChange, onNext, onBack }: Props) {
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
          {vibeOptions.map((vibe) => (
            <Badge
              key={vibe}
              variant={details.vibe_tag === vibe ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 capitalize"
              onClick={() => handleVibeToggle(vibe)}
            >
              {vibe}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          This helps Nova AI suggest better stops for your plan
        </p>
      </div>

      {/* Invites Placeholder */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Invite Friends
        </Label>
        <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
          <p className="text-sm">Friend invites coming soon!</p>
          <p className="text-xs mt-1">For now, you can share the plan link after creation</p>
        </div>
      </div>

      {/* Next Button */}
      <Button 
        onClick={handleNext} 
        className="w-full" 
        size="lg"
        disabled={!details.title.trim()}
      >
        Review Plan
      </Button>
    </div>
  )
}