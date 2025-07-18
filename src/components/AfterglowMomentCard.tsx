import { AfterglowMoment } from '@/hooks/useAfterglowData'
import { formatMomentTime, getMomentTypeIcon } from '@/utils/afterglowHelpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Mail, Users, MapPin } from 'lucide-react'
import { useState } from 'react'
import { PeopleEncountersModal } from '@/components/modals/PeopleEncountersModal'
import { LocationChip } from '@/components/location/LocationChip'
import { usePeopleData } from '@/hooks/usePeopleData'

interface AfterglowMomentCardProps {
  moment: AfterglowMoment
  index: number
  isFirst?: boolean
  onShare?: () => void
  onSave?: () => void
}

export function AfterglowMomentCard({ 
  moment, 
  index, 
  isFirst = false, 
  onShare, 
  onSave 
}: AfterglowMomentCardProps) {
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false)
  const { getPeopleInMoment } = usePeopleData()
  const getEventTypeIcon = (type: string) => {
    switch(type) {
      case "venue_checkin": 
      case "venue": 
        return <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40" />
      case "floq_join":
      case "floq": 
        return <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40" />
      case "plan_start":
      case "social": 
        return <div className="w-5 h-5 rounded-full bg-secondary/20 border border-secondary/40" />
      case "vibe_change":
      case "personal": 
        return <div className="w-5 h-5 rounded-full bg-muted/20 border border-muted/40" />
      default: 
        return <div className="w-2 h-2 rounded-full bg-foreground/20" />
    }
  }

  const getTimelineColor = (index: number) => {
    const colors = [
      "hsl(180 70% 60%)",
      "hsl(240 70% 60%)", 
      "hsl(280 70% 60%)",
      "hsl(320 70% 60%)"
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="relative flex items-start space-x-6">
      {/* Timeline dot */}
      <div 
        className="relative z-10 w-6 h-6 rounded-full flex-shrink-0 animate-pulse-glow border-2 border-background"
        style={{
          backgroundColor: moment.color.startsWith('#') ? moment.color : getTimelineColor(index),
          boxShadow: `0 0 30px ${moment.color.startsWith('#') ? moment.color : getTimelineColor(index)}40`
        }}
      />

      {/* Event card */}
      <div className="flex-1 bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/40 transition-smooth hover:glow-secondary hover:scale-[1.02]">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-muted-foreground text-sm font-medium">
              {formatMomentTime(moment.timestamp)}
            </span>
            {getEventTypeIcon(moment.moment_type)}
          </div>
          
          {isFirst && (
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 px-3 text-xs transition-smooth hover:glow-secondary"
                onClick={onShare}
              >
                <Mail className="w-3 h-3 mr-1" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs transition-smooth hover:glow-active"
                onClick={onSave}
              >
                <Heart className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold mb-2 text-foreground">{moment.title}</h3>
        
        {moment.description && (
          <p className="text-sm text-muted-foreground mb-3">{moment.description}</p>
        )}

        {/* Enhanced metadata display with people and location */}
        {moment.metadata && Object.keys(moment.metadata).length > 0 && (
          <div className="space-y-3 mt-4">
            {/* Location information */}
            {moment.metadata.location && (
              <div className="flex items-center gap-2">
                <LocationChip 
                  location={moment.metadata.location}
                  size="sm"
                  showDistance={!!moment.metadata.location.distance_from_previous}
                  interactive={!!moment.metadata.location.coordinates}
                  onClick={() => {
                    if (moment.metadata.location.coordinates) {
                      const [lng, lat] = moment.metadata.location.coordinates
                      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank', 'noopener,noreferrer')
                    }
                  }}
                />
              </div>
            )}

            {/* People and social context */}
            {moment.metadata.people && (
              <div className="flex items-center gap-2">
                {(() => {
                  const peopleData = getPeopleInMoment(moment.metadata)
                  const hasKnownConnections = peopleData.encountered_users.length > 0
                  
                  return (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-2 hover:bg-accent/50 transition-colors"
                        onClick={() => setIsPeopleModalOpen(true)}
                        aria-label={`Encountered ${peopleData.total_people_count} people`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span className="text-xs font-medium">{peopleData.total_people_count}</span>
                          {hasKnownConnections && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              {peopleData.encountered_users.length} known
                            </Badge>
                          )}
                        </div>
                      </Button>
                      
                      <PeopleEncountersModal
                        isOpen={isPeopleModalOpen}
                        onClose={() => setIsPeopleModalOpen(false)}
                        encounteredUsers={peopleData.encountered_users}
                        totalPeopleCount={peopleData.total_people_count}
                        momentTitle={moment.title}
                      />
                    </>
                  )
                })()}
              </div>
            )}

            {/* Traditional metadata badges */}
            <div className="flex flex-wrap gap-2">
              {moment.metadata.vibe && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {moment.metadata.vibe}
                </Badge>
              )}
              {moment.metadata.social_context?.floq_id && (
                <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                  Floq
                </Badge>
              )}
              {moment.metadata.social_context?.activity_type && (
                <Badge variant="outline" className="text-xs bg-secondary/10 text-secondary border-secondary/20">
                  {moment.metadata.social_context.activity_type}
                </Badge>
              )}
              {moment.metadata.intensity && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(moment.metadata.intensity * 100)}% intensity
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}