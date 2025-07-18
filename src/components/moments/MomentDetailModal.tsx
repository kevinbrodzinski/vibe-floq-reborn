import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MapPin, 
  Users, 
  Clock, 
  Heart,
  Share2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Activity,
  Calendar,
  X
} from 'lucide-react'
import { AfterglowMoment } from '@/hooks/useAfterglowData'
import { formatMomentTime, getMomentTypeIcon } from '@/utils/afterglowHelpers'
import { LocationChip } from '@/components/location/LocationChip'
import { usePeopleData } from '@/hooks/usePeopleData'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { MomentRelatedDays } from './MomentRelatedDays'
import { MomentMetadataExpanded } from './MomentMetadataExpanded'

interface MomentDetailModalProps {
  moment: AfterglowMoment | null
  momentIndex: number
  moments: AfterglowMoment[]
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
}

export function MomentDetailModal({
  moment,
  momentIndex,
  moments,
  isOpen,
  onClose,
  onNavigate
}: MomentDetailModalProps) {
  const { toast } = useToast()
  const { getPeopleInMoment } = usePeopleData()
  const [selectedTab, setSelectedTab] = useState<'details' | 'related' | 'metadata'>('details')
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft' && momentIndex > 0) {
        onNavigate(momentIndex - 1)
      } else if (event.key === 'ArrowRight' && momentIndex < moments.length - 1) {
        onNavigate(momentIndex + 1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, momentIndex, moments.length, onClose, onNavigate])

  if (!moment) return null

  const peopleData = getPeopleInMoment(moment.metadata)
  const hasKnownConnections = peopleData.encountered_users.length > 0

  const handleShare = async () => {
    const shareText = `"${moment.title}" - ${formatMomentTime(moment.timestamp)}\n\n${moment.description || ''}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: moment.title,
          text: shareText
        })
      } catch (error) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      toast({ title: 'Moment copied to clipboard' })
    }
  }

  const getTimelinePosition = () => {
    return ((momentIndex) / Math.max(moments.length - 1, 1)) * 100
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header with navigation */}
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: moment.color.startsWith('#') ? moment.color : 'hsl(var(--primary))',
                  }}
                />
                {moment.title}
              </DialogTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(momentIndex - 1)}
                  disabled={momentIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground px-2">
                  {momentIndex + 1} of {moments.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(momentIndex + 1)}
                  disabled={momentIndex === moments.length - 1}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6" />
                
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </Button>
                
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Timeline position indicator */}
            <div className="mt-4">
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${getTimelinePosition()}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <motion.div
                  className="absolute top-0 w-4 h-4 bg-primary rounded-full border-2 border-background -translate-y-1"
                  initial={{ left: 0 }}
                  animate={{ left: `calc(${getTimelinePosition()}% - 8px)` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Content tabs */}
          <div className="flex-1 flex flex-col">
            <div className="border-b">
              <div className="flex px-6">
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === 'details' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setSelectedTab('details')}
                >
                  <Sparkles className="w-4 h-4 mr-2 inline" />
                  Details
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === 'related' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setSelectedTab('related')}
                >
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Related Days
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === 'metadata' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setSelectedTab('metadata')}
                >
                  <Activity className="w-4 h-4 mr-2 inline" />
                  Metadata
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div ref={containerRef} className="p-6">
                <AnimatePresence mode="wait">
                  {selectedTab === 'details' && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Time and type */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatMomentTime(moment.timestamp)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getMomentTypeIcon(moment.moment_type)} {moment.moment_type.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Description */}
                      {moment.description && (
                        <div>
                          <h3 className="font-semibold mb-2">Description</h3>
                          <p className="text-muted-foreground leading-relaxed">{moment.description}</p>
                        </div>
                      )}

                      {/* Location */}
                      {moment.metadata?.location && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Location
                          </h3>
                          <LocationChip 
                            location={moment.metadata.location}
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

                      {/* People */}
                      {moment.metadata?.people && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            People ({peopleData.total_people_count})
                          </h3>
                          
                          {hasKnownConnections && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-muted-foreground">Known Connections</h4>
                               <div className="grid gap-3">
                                 {peopleData.encountered_users.map((user, index) => (
                                   <div key={user.user_id || index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                     <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                       <Users className="w-4 h-4" />
                                     </div>
                                     <div className="flex-1">
                                       <div className="font-medium">User {user.user_id}</div>
                                       <div className="text-sm text-muted-foreground">
                                         Strength: {user.interaction_strength} • Duration: {user.shared_duration}
                                       </div>
                                     </div>
                                   </div>
                                 ))}
                              </div>
                            </div>
                          )}
                          
                          {peopleData.total_people_count > peopleData.encountered_users.length && (
                            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                              <div className="text-sm text-muted-foreground">
                                +{peopleData.total_people_count - peopleData.encountered_users.length} other people encountered
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Additional metadata */}
                      {(moment.metadata?.vibe || moment.metadata?.intensity) && (
                        <div>
                          <h3 className="font-semibold mb-3">Vibe & Energy</h3>
                          <div className="flex gap-2">
                            {moment.metadata.vibe && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                {moment.metadata.vibe}
                              </Badge>
                            )}
                            {moment.metadata.intensity && (
                              <Badge variant="outline">
                                {Math.round(moment.metadata.intensity * 100)}% intensity
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {selectedTab === 'related' && (
                    <motion.div
                      key="related"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MomentRelatedDays moment={moment} />
                    </motion.div>
                  )}

                  {selectedTab === 'metadata' && (
                    <motion.div
                      key="metadata"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MomentMetadataExpanded metadata={moment.metadata} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}