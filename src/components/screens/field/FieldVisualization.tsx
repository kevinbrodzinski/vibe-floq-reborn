import { useState, useEffect } from "react";
import { FriendConstellation } from "@/components/FriendConstellation";
import { AvatarInteractionLayer } from "@/components/AvatarInteractionLayer";
import { FloqOrb } from "@/components/FloqOrb";
import { ClusterPin } from "@/components/map/ClusterPin";
import { VenuePin } from "@/components/map/VenuePin";
import { ViewportControls } from "@/components/map/ViewportControls";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { ClusterVenuesSheet } from "@/components/ClusterVenuesSheet";
import { useMapViewport } from "@/hooks/useMapViewport";
import { useVenueClusters } from "@/hooks/useVenueClusters";
import { latLngToField, mToPercent } from "@/utils/geoConversion";
import type { WalkableFloq } from "@/types";

interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
}

interface FloqEvent {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  participants: number;
  vibe: string;
}

interface Friend {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  relationship: 'close' | 'friend' | 'acquaintance';
  activity: 'active' | 'idle' | 'away';
  warmth: number;
  compatibility: number;
  lastSeen: number;
}

interface FieldVisualizationProps {
  constellationMode: boolean;
  people: Person[];
  friends: Friend[];
  floqEvents: FloqEvent[];
  walkableFloqs?: WalkableFloq[];
  onFriendInteraction: (friend: any, action: string) => void;
  onConstellationGesture: (gesture: string, friends: any[]) => void;
  onAvatarInteraction: (interaction: any) => void;
}

export const FieldVisualization = ({
  constellationMode,
  people,
  friends,
  floqEvents,
  walkableFloqs = [],
  onFriendInteraction,
  onConstellationGesture,
  onAvatarInteraction
}: FieldVisualizationProps) => {
  // Initialize viewport management
  const viewportControls = useMapViewport();
  const { viewport } = viewportControls;
  
  // Get venue clusters for current viewport
  const { clusters: venueClusters } = useVenueClusters(viewport);
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  
  // Cluster sheet state
  const [clusterSheetOpen, setClusterSheetOpen] = useState(false);
  const [activeCluster, setActiveCluster] = useState<{ id: number; lat: number; lng: number } | null>(null);

  // Handle cluster click - open details sheet for clusters
  const handleClusterClick = (cluster: any) => {
    if (cluster.pointCount > 0) {
      // Extract numeric cluster ID from supercluster properties
      const clusterId = cluster.props.cluster_id;
      setActiveCluster({ id: clusterId, lat: cluster.lat, lng: cluster.lng });
      setClusterSheetOpen(true);
    }
  };

  const handleVenueClick = (v: any) => {
    // cluster → open cluster details sheet
    if (v.pointCount > 0) {
      handleClusterClick(v);
      return;
    }

    // single venue → open details sheet
    setSelectedVenueId(v.id);
    setDetailsOpen(true);
  };

  // Auto-dismiss cluster sheet when cluster dissolves on zoom
  useEffect(() => {
    if (!activeCluster || !clusterSheetOpen) return;
    
    const stillExists = venueClusters.some(
      (c) => c.props.cluster_id === activeCluster.id && c.pointCount > 0
    );
    
    if (!stillExists) {
      setClusterSheetOpen(false);
      setActiveCluster(null);
    }
  }, [venueClusters, activeCluster, clusterSheetOpen]);

  return (
    <div className="relative h-full pt-48 pb-32">
      {/* Friend Constellation System */}
      {constellationMode && (
        <FriendConstellation
          friends={friends}
          centerX={50}
          centerY={50}
          onFriendInteraction={onFriendInteraction}
          onConstellationGesture={onConstellationGesture}
        />
      )}

      {/* People on the field (when not in constellation mode) */}
      {!constellationMode && people.map((person, index) => (
        <div
          key={person.id}
          className="absolute transition-all duration-500 cursor-pointer hover:scale-110"
          style={{
            left: `${person.x}%`,
            top: `${person.y}%`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full animate-pulse-glow"
            style={{
              backgroundColor: person.color,
              boxShadow: `0 0 20px ${person.color}`,
            }}
          ></div>
          <div className="text-sm text-center mt-2 text-foreground/90">
            {person.name}
          </div>
        </div>
      ))}

      {/* Floq Events - Enhanced with FloqOrb for walkable floqs */}
      {floqEvents.map((event, index) => {
        // Check if this floq is walkable
        const walkableFloq = walkableFloqs.find(wf => wf.id === event.id);
        const isWalkable = walkableFloq && walkableFloq.distance_meters <= 300;
        
        return (
          <div
            key={event.id}
            className="absolute transition-all duration-500 cursor-pointer hover:scale-105 group"
            style={{
              left: `${event.x}%`,
              top: `${event.y}%`,
              transform: "translate(-50%, -50%)",
              width: `${event.size}px`,
              height: `${event.size}px`,
              animationDelay: `${index * 0.2}s`,
            }}
          >
            <div className="relative w-full h-full animate-fade-in">
              {/* Outer ripple ring - dashed if walkable */}
              <div className={`absolute inset-0 border-2 rounded-full animate-pulse group-hover:border-primary/40 ${
                isWalkable 
                  ? 'border-dashed border-primary/60' 
                  : 'border-primary/20'
              }`}></div>
              {/* Middle ring */}
              <div className="absolute inset-2 border border-accent/30 rounded-full"></div>
              {/* Inner glowing core */}
              <div 
                className="absolute inset-6 rounded-full animate-pulse-glow group-hover:glow-active"
                style={{
                  backgroundColor: event.vibe === 'hype' ? 'hsl(280 70% 60%)' : 
                                   event.vibe === 'social' ? 'hsl(30 70% 60%)' : 
                                   event.vibe === 'chill' ? 'hsl(240 70% 60%)' :
                                   event.vibe === 'flowing' ? 'hsl(200 70% 60%)' :
                                   event.vibe === 'open' ? 'hsl(120 70% 60%)' :
                                   'hsl(240 70% 60%)',
                  boxShadow: `0 0 30px ${event.vibe === 'hype' ? 'hsl(280 70% 60%)' : 
                                        event.vibe === 'social' ? 'hsl(30 70% 60%)' : 
                                        event.vibe === 'chill' ? 'hsl(240 70% 60%)' :
                                        event.vibe === 'flowing' ? 'hsl(200 70% 60%)' :
                                        event.vibe === 'open' ? 'hsl(120 70% 60%)' :
                                        'hsl(240 70% 60%)'}40`
                }}
              ></div>
              
              {/* Distance indicator for walkable floqs */}
              {isWalkable && walkableFloq && (
                <div className="absolute -top-2 -right-2 bg-primary/20 text-primary text-xs px-1 py-0.5 rounded border border-primary/30">
                  {Math.round(walkableFloq.distance_meters)}m
                </div>
              )}
            </div>
            <div className="text-sm text-center mt-2 text-foreground font-medium group-hover:text-primary transition-smooth">
              {event.title}
              <div className="text-xs text-muted-foreground">{event.participants} people</div>
            </div>
          </div>
        );
      })}

      {/* Venue Clusters and Pins */}
      {venueClusters.map((cluster) => {
        const fieldCoords = latLngToField(cluster.lat, cluster.lng, viewport);
        
        return (
          <div
            key={cluster.id}
            className="absolute transition-all duration-300"
            style={{
              left: `${fieldCoords.x}%`,
              top: `${fieldCoords.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {cluster.pointCount > 0 ? (
              <ClusterPin 
                count={cluster.pointCount} 
                onClick={() => handleVenueClick(cluster)}
              />
            ) : (
              <VenuePin 
                vibe={cluster.props.vibe}
                name={cluster.props.name}
                onClick={() => handleVenueClick(cluster)}
              />
            )}
          </div>
        );
      })}

      {/* Avatar Interaction Layer */}
      <AvatarInteractionLayer 
        people={people}
        onInteraction={onAvatarInteraction}
      />

      {/* Viewport Controls */}
      <ViewportControls controls={viewportControls} />

      <VenueDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedVenueId(null);
        }}
        venueId={selectedVenueId}
      />

      <ClusterVenuesSheet
        isOpen={clusterSheetOpen}
        onClose={() => {
          setClusterSheetOpen(false);
          setActiveCluster(null);
        }}
        clusterId={activeCluster?.id || null}
        onVenueTap={(venueId) => {
          // Close cluster sheet and open venue details
          setClusterSheetOpen(false);
          setActiveCluster(null);
          setSelectedVenueId(venueId);
          setDetailsOpen(true);
        }}
        onZoomToArea={() => {
          if (activeCluster) {
            viewportControls.panTo(activeCluster.lat, activeCluster.lng);
            viewportControls.zoomIn();
          }
        }}
      />
    </div>
  );
};