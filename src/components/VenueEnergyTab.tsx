import { Suspense } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Activity, Clock, Users, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useVenueEnergy } from "@/hooks/useVenueEnergy";
import { vibeEmoji } from "@/utils/vibe";

interface VenueEnergyTabProps {
  venueId: string;
}

function VenueEnergyContent({ venueId }: VenueEnergyTabProps) {
  const { data: energyData, isLoading, error } = useVenueEnergy(venueId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Gathering venue energy...
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-card/30 animate-pulse">
              <div className="h-4 bg-muted/50 rounded mb-2" />
              <div className="h-8 bg-muted/50 rounded mb-2" />
              <div className="h-2 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-card/30 animate-pulse">
          <div className="h-4 bg-muted/50 rounded mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-muted/50 rounded" />
            <div className="h-3 bg-muted/50 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !energyData) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-4xl">🔍</div>
        <div>
          <p className="text-lg font-medium text-muted-foreground mb-2">
            Checking the vibe...
          </p>
          <p className="text-sm text-muted-foreground">
            This venue is still warming up. Check back in a moment!
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Social Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Vibe Diversity</span>
          </div>
          <div className="text-2xl font-bold">{Math.round((energyData.vibe_diversity_score || 0) * 100)}%</div>
          <Progress value={(energyData.vibe_diversity_score || 0) * 100} className="mt-2" />
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Avg Session</span>
          </div>
          <div className="text-2xl font-bold">{Math.round(energyData.avg_session_minutes || 0)}m</div>
          <p className="text-xs text-muted-foreground mt-1">
            {energyData.socialTexture?.socialDynamics?.sessionIntensity || 'Building momentum'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Active Floqs</span>
          </div>
          <div className="text-2xl font-bold">{energyData.active_floq_count || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {energyData.total_floq_members || 0} total members
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium">Dominant Vibe</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{vibeEmoji(energyData.dominant_vibe || 'chill')}</span>
            <span className="text-lg font-bold capitalize">{energyData.dominant_vibe || 'chill'}</span>
          </div>
        </div>
      </div>

      {/* Timing Insights */}
      <div className="p-4 rounded-xl bg-card/50 border border-border/50">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Social Insights
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Crowd Size</span>
            <span className="text-sm font-medium">{energyData.socialTexture?.socialDynamics?.crowdSize || 'Intimate'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Vibe Stability</span>
            <div className="flex items-center gap-2">
              <Progress value={(energyData.socialTexture?.socialDynamics?.vibeStability || 0) * 100} className="w-16" />
              <span className="text-sm font-medium">{Math.round((energyData.socialTexture?.socialDynamics?.vibeStability || 0) * 100)}%</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary font-medium">
              💡 {energyData.socialTexture?.timingInsights?.recommendation || 'Perfect time to join the vibe!'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function VenueEnergyTab({ venueId }: VenueEnergyTabProps) {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-card/30 animate-pulse">
              <div className="h-4 bg-muted/50 rounded mb-2" />
              <div className="h-8 bg-muted/50 rounded mb-2" />
              <div className="h-2 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    }>
      <VenueEnergyContent venueId={venueId} />
    </Suspense>
  );
}