import { useState, useEffect, useRef } from "react";
import { FriendConstellation } from "@/components/FriendConstellation";
import { AvatarInteractionLayer } from "@/components/AvatarInteractionLayer";
import { FloqOrb } from "@/components/FloqOrb";
import { ClusterPin } from "@/components/map/ClusterPin";
import { VenuePin } from "@/components/map/VenuePin";
import { ViewportControls } from "@/components/map/ViewportControls";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { ClusterVenuesSheet } from "@/components/ClusterVenuesSheet";
import { DMQuickSheet } from "@/components/DMQuickSheet";
import { useLongPress } from "@/hooks/useLongPress";
import { useMapViewport } from "@/hooks/useMapViewport";
import { useVenueClusters } from "@/hooks/useVenueClusters";
import { useSelectedVenue } from "@/store/useSelectedVenue";
import { useAvatarPreloader } from "@/hooks/useAvatarPreloader";
import { latLngToField, mToPercent } from "@/utils/geoConversion";
import type { WalkableFloq } from "@/types";
import { LayersPortal } from "@/components/LayersPortal";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useStableMemo } from "@/hooks/useStableMemo";
import { Z_LAYERS } from "@/lib/z-layers";
import { getVibeColor } from "@/utils/getVibeColor";
import { track } from "@/lib/analytics";
import { useMemo } from "react";
import { jitterPoint, groupByPosition } from '@/utils/jitter';
import ClusterBadge from '@/components/ClusterBadge';

interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  isFriend?: boolean; // 6.4 - Add friend flag for UI enhancement
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
  avatar_url?: string | null;
}

interface FieldVisualizationProps {
  mini?: boolean;
  className?: string;
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
  mini = false,
  className = "",
  constellationMode,
  people,
  friends,
  floqEvents,
  walkableFloqs = [],
  onFriendInteraction,
  onConstellationGesture,
  onAvatarInteraction
}: FieldVisualizationProps) => {
  // Phase 1C Fix: Optimized avatar preloader dependencies
  const friendAvatars = useStableMemo(
    () => friends.map(f => f.avatar_url), 
    [friends]
  );
  useAvatarPreloader(friendAvatars, mini ? [32] : [32, 64]);
  
  // Phase 1B Fix: Analytics de-dupe with persistent seenRef
  const seenRef = useRef<Set<string>>(new Set());
  const friendIdsHash = useMemo(
    () => people.filter(p => p.isFriend).map(p => p.id).sort().join(','),
    [people]
  );

  useEffect(() => {
    people.forEach(person => {
      if (person.isFriend && !seenRef.current.has(person.id)) {
        seenRef.current.add(person.id);
        track('friend_encounter', { 
          friend_id: person.id, 
          vibe: person.vibe,
          location: 'field_visualization'
        });
      }
    });
  }, [friendIdsHash]);
  
  // DM state
  const [dmOpen, setDmOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  
  // Long-press handler for avatars
  const handleAvatarLongPress = (friendId: string) => {
    setSelectedFriendId(friendId);
    setDmOpen(true);
  };

  // Initialize viewport management
  const viewportControls = useMapViewport();
  const { viewport } = viewportControls;
  
  // Get venue clusters for current viewport
  const { clusters: venueClusters, supercluster } = useVenueClusters(viewport);
  
  // Use centralized selected venue store
  const { selectedVenueId, setSelectedVenueId } = useSelectedVenue();
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Cluster sheet state
  const [clusterSheetOpen, setClusterSheetOpen] = useState(false);
  const [activeClusterBbox, setActiveClusterBbox] = useState<[number, number, number, number] | null>(null);

  // Handle cluster click - open details sheet for clusters
  const handleClusterClick = (cluster: any) => {
    if (cluster.pointCount > 0 && supercluster) {
      // Extract the actual cluster ID from props
      const clusterId = cluster.props?.cluster_id;
      
      if (clusterId) {
        // Get the real cluster expansion bbox using Supercluster
        const leaves = supercluster.getLeaves(clusterId, Infinity);
        
        if (leaves.length > 0) {
          // Calculate bbox from actual cluster venues
          const lngs = leaves.map((leaf: any) => leaf.geometry.coordinates[0]);
          const lats = leaves.map((leaf: any) => leaf.geometry.coordinates[1]);
          
          const bbox: [number, number, number, number] = [
            Math.min(...lngs), // west
            Math.min(...lats), // south
            Math.max(...lngs), // east
            Math.max(...lats)  // north
          ];
          
          setActiveClusterBbox(bbox);
          setClusterSheetOpen(true);
        }
      }
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
    if (!activeClusterBbox || !clusterSheetOpen) return;
    
    // For simplicity, we keep the sheet open when zooming
    // You could enhance this to check if the bbox still contains clusters
  }, [venueClusters, activeClusterBbox, clusterSheetOpen]);

  return (
    <div className={`relative h-full ${mini ? 'pt-2 pb-2' : 'pt-48 pb-32'} ${className}`}>
      {/* Friend Constellation System */}
      {constellationMode && !mini && (
        <FriendConstellation
          friends={friends}
          centerX={50}
          centerY={50}
          onFriendInteraction={onFriendInteraction}
          onConstellationGesture={onConstellationGesture}
        />
      )}

      {/* People on the field with collision detection (when not in constellation mode) */}
      {!constellationMode &&
        /* ---- Phase 2: Collision handling ---- */
        Object.values(groupByPosition(people)).map(cluster => {
          if (cluster.length === 0) return null;

          // Calculate pixel coords once (each person already has x/y in percentage);
          const base = cluster[0];

          // 1️⃣ Render dots with jitter when cluster size ≤ 4
          if (cluster.length <= 4) {
            return cluster.map((person, idx) => {
              const { dx, dy } = jitterPoint(idx);
              return (
                <HoverCard key={person.id}>
                  <HoverCardTrigger asChild>
                    <div
                      className="absolute person-dot cursor-pointer hover:scale-110 pointer-events-auto"
                      style={{
                        left: `${person.x}%`,
                        top: `${person.y}%`,
                        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                        zIndex: Z_LAYERS.PEOPLE_DOTS,
                      }}
                    >
                      {/* Phase 2: Dynamic friend halo using CSS custom properties for Tailwind compatibility */}
                      {person.isFriend && (
                        <div 
                          className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-offset-background/20 animate-pulse" 
                          style={{ 
                            width: mini ? '16px' : '24px', 
                            height: mini ? '16px' : '24px',
                            transform: 'translate(-50%, -50%)',
                            left: '50%',
                            top: '50%',
                            '--dynamic-ring-color': getVibeColor(person.vibe),
                            borderColor: `${getVibeColor(person.vibe)}60`,
                          } as React.CSSProperties} 
                        />
                      )}
                      <div
                        className={`rounded-full animate-pulse-glow ${mini ? 'w-2 h-2' : 'w-4 h-4'}`}
                        style={{
                          backgroundColor: person.color,
                          boxShadow: `0 0 20px ${person.color}`,
                        }}
                      ></div>
                      {!mini && (
                        <div className={`text-sm text-center mt-2 ${person.isFriend ? 'text-primary font-medium' : 'text-foreground/90'}`}>
                          {person.name}
                        </div>
                      )}
                    </div>
                  </HoverCardTrigger>
                  <LayersPortal layer="popover">
                    <HoverCardContent 
                      className="w-64 p-4"
                      side="top"
                      sideOffset={8}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium text-sm ${person.isFriend ? 'text-primary' : ''}`}>
                            {person.name}
                          </h4>
                          {person.isFriend && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Friend</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: person.color }}
                          />
                          <span className="text-xs text-muted-foreground capitalize">{person.vibe}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Currently active in the area
                        </p>
                      </div>
                    </HoverCardContent>
                  </LayersPortal>
                </HoverCard>
              );
            });
          }

          // 2️⃣ If > 4 members → jitter first 4, then show "+N"
          return (
            <div key={`cluster-${base.x}-${base.y}`}>
              {cluster.slice(0, 4).map((person, idx) => {
                const { dx, dy } = jitterPoint(idx);
                return (
                  <HoverCard key={person.id}>
                    <HoverCardTrigger asChild>
                      <div
                        className="absolute person-dot cursor-pointer hover:scale-110 pointer-events-auto"
                        style={{
                          left: `${person.x}%`,
                          top: `${person.y}%`,
                          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                          zIndex: Z_LAYERS.PEOPLE_DOTS,
                        }}
                        onClick={() => onAvatarInteraction?.(person.id)}
                      >
                        {/* Phase 2: Dynamic friend halo using CSS custom properties for Tailwind compatibility */}
                        {person.isFriend && (
                          <div 
                            className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-offset-background/20 animate-pulse" 
                            style={{ 
                              width: mini ? '16px' : '24px', 
                              height: mini ? '16px' : '24px',
                              transform: 'translate(-50%, -50%)',
                              left: '50%',
                              top: '50%',
                              '--dynamic-ring-color': getVibeColor(person.vibe),
                              borderColor: `${getVibeColor(person.vibe)}60`,
                            } as React.CSSProperties} 
                          />
                        )}
                        <div
                          className={`rounded-full animate-pulse-glow ${mini ? 'w-2 h-2' : 'w-4 h-4'}`}
                          style={{
                            backgroundColor: person.color,
                            boxShadow: `0 0 20px ${person.color}`,
                          }}
                        ></div>
                        {!mini && (
                          <div className={`text-sm text-center mt-2 ${person.isFriend ? 'text-primary font-medium' : 'text-foreground/90'}`}>
                            {person.name}
                          </div>
                        )}
                      </div>
                    </HoverCardTrigger>
                    <LayersPortal layer="popover">
                      <HoverCardContent 
                        className="w-64 p-4"
                        side="top"
                        sideOffset={8}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm ${person.isFriend ? 'text-primary' : ''}`}>
                              {person.name}
                            </h4>
                            {person.isFriend && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Friend</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: person.color }}
                            />
                            <span className="text-xs text-muted-foreground capitalize">{person.vibe}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Currently active in the area
                          </p>
                        </div>
                      </HoverCardContent>
                    </LayersPortal>
                  </HoverCard>
                );
              })}
              <ClusterBadge
                count={cluster.length - 4}
                x={base.x}
                y={base.y}
              />
            </div>
          );
        })}

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
              {isWalkable && walkableFloq && !mini && (
                <div className="absolute -top-2 -right-2 bg-primary/20 text-primary text-xs px-1 py-0.5 rounded border border-primary/30">
                  {Math.round(walkableFloq.distance_meters)}m
                </div>
              )}
            </div>
            {!mini && (
              <div className="text-sm text-center mt-2 text-foreground font-medium group-hover:text-primary transition-smooth">
                {event.title}
                <div className="text-xs text-muted-foreground">{event.participants} people</div>
              </div>
            )}
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
      {!mini && (
        <AvatarInteractionLayer 
          people={people}
          onInteraction={onAvatarInteraction}
        />
      )}

      {/* Viewport Controls */}
      {!mini && <ViewportControls controls={viewportControls} />}

      {!mini && (
        <>
          <LayersPortal layer="sheet">
            <VenueDetailsSheet
              open={detailsOpen}
              onOpenChange={(open) => {
                setDetailsOpen(open);
                if (!open) setSelectedVenueId(null);
              }}
              venueId={selectedVenueId}
            />
          </LayersPortal>

          <LayersPortal layer="sheet">
            <ClusterVenuesSheet
              isOpen={clusterSheetOpen}
              onClose={() => {
                setClusterSheetOpen(false);
                setActiveClusterBbox(null);
              }}
              clusterBbox={activeClusterBbox}
              onVenueTap={(venueId) => {
                // Close cluster sheet and open venue details
                setClusterSheetOpen(false);
                setActiveClusterBbox(null);
                setSelectedVenueId(venueId);
                setDetailsOpen(true);
              }}
              onZoomToArea={() => {
                if (activeClusterBbox) {
                  // Pan to center of bounding box
                  const centerLat = (activeClusterBbox[1] + activeClusterBbox[3]) / 2;
                  const centerLng = (activeClusterBbox[0] + activeClusterBbox[2]) / 2;
                  viewportControls.panTo(centerLat, centerLng);
                  viewportControls.zoomIn();
                }
              }}
            />
          </LayersPortal>
          
          {/* DM Quick Sheet */}
          <LayersPortal layer="sheet">
            <DMQuickSheet
              open={dmOpen}
              onOpenChange={setDmOpen}
              friendId={selectedFriendId}
            />
          </LayersPortal>
        </>
      )}
    </div>
  );
};