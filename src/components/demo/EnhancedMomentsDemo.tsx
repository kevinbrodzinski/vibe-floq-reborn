import { AfterglowMomentCard } from '@/components/AfterglowMomentCard'
import { sampleMomentsWithMetadata } from '@/utils/sampleAfterglowData'

export function EnhancedMomentsDemo() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Enhanced Afterglow Moments</h2>
        <p className="text-muted-foreground">
          Now featuring people encounters and rich location data
        </p>
      </div>

      <div className="relative">
        {/* Timeline connecting line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary/50 via-accent/50 to-secondary/50" />
        
        {/* Moments */}
        <div className="space-y-8">
          {sampleMomentsWithMetadata.map((moment, index) => (
            <AfterglowMomentCard
              key={`${moment.timestamp}-${index}`}
              moment={moment}
              index={index}
              isFirst={index === 0}
              onShare={() => console.log('Share clicked for:', moment.title)}
              onSave={() => console.log('Save clicked for:', moment.title)}
            />
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Click on people counts to see encounter details</p>
        <p>Click on location chips to view on map</p>
      </div>
    </div>
  )
}