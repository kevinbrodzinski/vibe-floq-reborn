import React, { useState, useRef } from 'react'
import { AfterglowMoment } from '@/hooks/useAfterglowData'
import { formatMomentTime, getMomentTypeIcon } from '@/utils/afterglowHelpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Mail, Users, MapPin, Eye, Sparkles } from 'lucide-react'
import { PeopleEncountersModal } from '@/components/modals/PeopleEncountersModal'
import { LocationChip } from '@/components/location/LocationChip'
import { usePeopleData } from '@/hooks/usePeopleData'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { motion, useInView } from 'framer-motion'
import { MomentDetailModal } from '@/components/moments/MomentDetailModal'
import { ParticleField } from '@/components/effects/ParticleField'

interface EnhancedAfterglowMomentCardProps {
  moment: AfterglowMoment
  moments: AfterglowMoment[]
  index: number
  isFirst?: boolean
  isHighlighted?: boolean
  onShare?: () => void
  onSave?: () => void
}

export function EnhancedAfterglowMomentCard({ 
  moment, 
  moments,
  index, 
  isFirst = false,
  isHighlighted = false,
  onShare, 
  onSave 
}: EnhancedAfterglowMomentCardProps) {
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const { getPeopleInMoment } = usePeopleData()
  const { tapFeedback, navigationFeedback } = useHapticFeedback()
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, margin: "-10%" })

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

  const handleCardClick = async () => {
    navigationFeedback()
    setIsDetailModalOpen(true)
  }

  const handleActionClick = async (action: () => void) => {
    tapFeedback()
    action()
  }

  const handleMouseEnter = () => {
    setShowParticles(true)
  }

  const handleMouseLeave = () => {
    setShowParticles(false)
  }

  const peopleData = getPeopleInMoment(moment.metadata)
  const hasKnownConnections = peopleData.encountered_users.length > 0

  return (
    <>
      <motion.div 
        ref={cardRef}
        className="relative flex items-start space-x-6 group"
        initial={{ opacity: 0, x: -50 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
        transition={{ duration: 0.6, delay: index * 0.1 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Enhanced timeline dot with glow */}
        <motion.div 
          className="relative z-10 w-8 h-8 rounded-full flex-shrink-0 border-2 border-background cursor-pointer overflow-hidden"
          style={{
            backgroundColor: moment.color.startsWith('#') ? moment.color : getTimelineColor(index),
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCardClick}
        >
          {/* Animated glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundColor: moment.color.startsWith('#') ? moment.color : getTimelineColor(index),
              boxShadow: `0 0 30px ${moment.color.startsWith('#') ? moment.color : getTimelineColor(index)}60`
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Particle effects on hover */}
          <ParticleField
            isActive={showParticles}
            intensity={0.3}
            color={moment.color.startsWith('#') ? moment.color : getTimelineColor(index)}
            direction="radial"
          />
        </motion.div>

        {/* Enhanced event card */}
        <motion.div 
          className={`flex-1 bg-card/90 backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300 cursor-pointer relative overflow-hidden ${
            isHighlighted 
              ? 'border-primary/60 shadow-lg shadow-primary/20 bg-primary/5' 
              : 'border-border/40 hover:border-border/60'
          }`}
          whileHover={{ 
            scale: 1.02,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCardClick}
        >
          {/* Background gradient overlay */}
          <div 
            className="absolute inset-0 opacity-5 rounded-3xl"
            style={{
              background: `radial-gradient(circle at top right, ${moment.color.startsWith('#') ? moment.color : getTimelineColor(index)}, transparent 60%)`
            }}
          />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <motion.span 
                  className="text-muted-foreground text-sm font-medium"
                  whileHover={{ scale: 1.05 }}
                >
                  {formatMomentTime(moment.timestamp)}
                </motion.span>
                {getEventTypeIcon(moment.moment_type)}
                
                {/* New view details button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleActionClick(() => setIsDetailModalOpen(true))
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
              
              {isFirst && (
                <motion.div 
                  className="flex flex-wrap gap-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 px-3 text-xs transition-all duration-300 hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleActionClick(() => onShare?.())
                    }}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-3 text-xs transition-all duration-300 hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleActionClick(() => onSave?.())
                    }}
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </motion.div>
              )}
            </div>

            <motion.h3 
              className="text-lg font-bold mb-3 text-foreground"
              layoutId={`title-${index}`}
            >
              {moment.title}
              {/* Sparkle effect for special moments */}
              {moment.metadata?.intensity && moment.metadata.intensity > 0.8 && (
                <motion.span
                  className="inline-block ml-2"
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.span>
              )}
            </motion.h3>
            
            {moment.description && (
              <motion.p 
                className="text-sm text-muted-foreground mb-4 leading-relaxed"
                layoutId={`description-${index}`}
              >
                {moment.description}
              </motion.p>
            )}

            {/* Enhanced metadata display */}
            {moment.metadata && Object.keys(moment.metadata).length > 0 && (
              <motion.div 
                className="space-y-3 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Location information with enhanced interaction */}
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

                {/* Enhanced people display */}
                {moment.metadata.people && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-2 hover:bg-accent/50 transition-all duration-300 hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActionClick(() => setIsPeopleModalOpen(true))
                      }}
                      aria-label={`Encountered ${peopleData.total_people_count} people`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium">{peopleData.total_people_count}</span>
                        {hasKnownConnections && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 animate-pulse">
                            {peopleData.encountered_users.length} known
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </div>
                )}

                {/* Enhanced metadata badges with animations */}
                <motion.div 
                  className="flex flex-wrap gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, staggerChildren: 0.1 }}
                >
                  {moment.metadata.vibe && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        {moment.metadata.vibe}
                      </Badge>
                    </motion.div>
                  )}
                  {moment.metadata.social_context?.floq_id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                        Floq
                      </Badge>
                    </motion.div>
                  )}
                  {moment.metadata.social_context?.activity_type && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Badge variant="outline" className="text-xs bg-secondary/10 text-secondary border-secondary/20">
                        {moment.metadata.social_context.activity_type}
                      </Badge>
                    </motion.div>
                  )}
                  {moment.metadata.intensity && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          moment.metadata.intensity > 0.7 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                            : 'bg-muted/10 text-muted-foreground border-muted/20'
                        }`}
                      >
                        {Math.round(moment.metadata.intensity * 100)}% intensity
                      </Badge>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* People modal */}
        <PeopleEncountersModal
          isOpen={isPeopleModalOpen}
          onClose={() => setIsPeopleModalOpen(false)}
          encounteredUsers={peopleData.encountered_users}
          totalPeopleCount={peopleData.total_people_count}
          momentTitle={moment.title}
        />
      </motion.div>

      {/* Enhanced detail modal */}
      <MomentDetailModal
        moment={moment}
        momentIndex={index}
        moments={moments}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onNavigate={(newIndex) => setIsDetailModalOpen(false)} // Close and let parent handle navigation
      />
    </>
  )
}