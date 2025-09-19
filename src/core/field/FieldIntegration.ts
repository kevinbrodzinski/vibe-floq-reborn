// Integration layer connecting field dynamics to existing intelligence systems
import { estimateVenuePulse } from '@/core/venue/PulseEstimator';
import { estimateCohesion } from '@/core/group/CohesionEstimator';
import { updatePersonEnergy, type PersonState, type GroupState } from './FieldCoupling';
import type { VenueIntelligence } from '@/types/venues';
import type { Vibe } from '@/lib/vibes';

export interface FieldIntegrationState {
  personState: PersonState;
  groupStates: Map<string, GroupState>;
  venueEnergies: Map<string, { energy: number; slope: number; volatility: number }>;
  lastUpdate: number;
}

export class FieldIntegrationEngine {
  private state: FieldIntegrationState;
  private updateCallbacks: Set<(state: FieldIntegrationState) => void> = new Set();

  constructor() {
    this.state = {
      personState: {
        energy: 0.5,
        slope: 0,
        momentum: 0,
        vibe: 'social',
        friendsPresent: 0
      },
      groupStates: new Map(),
      venueEnergies: new Map(),
      lastUpdate: Date.now()
    };
  }

  // Integration point for vibe engine
  updatePersonVibe(vibe: Vibe, confidence: number) {
    this.state.personState = {
      ...this.state.personState,
      vibe,
      energy: Math.max(this.state.personState.energy, confidence * 0.3) // confidence boosts energy
    };
    this.notifyStateChange();
  }

  // Integration point for venue intelligence
  updateVenueIntelligence(venueId: string, intelligence: VenueIntelligence) {
    const pulse = estimateVenuePulse(intelligence);
    this.state.venueEnergies.set(venueId, pulse);
    
    // Update person energy based on current venue
    this.state.personState = updatePersonEnergy(
      this.state.personState,
      intelligence,
      this.getCurrentGroup()
    );
    
    this.notifyStateChange();
  }

  // Integration point for group activities (floqs, plans)
  updateGroupMembers(groupId: string, memberSignals: Array<{ energy: number; style?: number }>) {
    const cohesion = estimateCohesion(memberSignals);
    this.state.groupStates.set(groupId, {
      energy: cohesion.energy,
      cohesion: cohesion.cohesion,
      fragmentationRisk: cohesion.fragmentationRisk,
      size: memberSignals.length
    });
    
    // Update person energy based on group dynamics
    this.state.personState = updatePersonEnergy(
      this.state.personState,
      undefined,
      this.getCurrentGroup()
    );
    
    this.notifyStateChange();
  }

  // Integration point for presence system
  updateFriendsPresent(count: number, total: number = 10) {
    this.state.personState = {
      ...this.state.personState,
      friendsPresent: Math.min(1, count / total)
    };
    this.notifyStateChange();
  }

  // Get enhanced recommendations based on field state
  getActivityRecommendationBoosts(): { venueEnergyBoost: number; groupSizeOptimal: number; vibeAlignment: number } {
    const person = this.state.personState;
    const group = this.getCurrentGroup();
    
    return {
      venueEnergyBoost: person.energy > 0.7 ? 0.2 : person.energy < 0.3 ? -0.1 : 0,
      groupSizeOptimal: group && group.cohesion > 0.8 ? group.size : person.energy > 0.6 ? 4 : 2,
      vibeAlignment: person.momentum > 0.5 ? 0.15 : -0.05
    };
  }

  // Get group predictability assessment for planning
  getGroupPredictability(groupId: string): { omegaG: number; pG: number; gatePass: boolean } {
    const group = this.state.groupStates.get(groupId);
    if (!group) return { omegaG: 0, pG: 0, gatePass: false };

    // Use cohesion and fragmentation risk to assess predictability
    const omegaG = group.cohesion; // cohesion as quantile spread proxy
    const pG = 1 - group.fragmentationRisk; // inverse fragmentation as info gain proxy
    const gatePass = group.cohesion > 0.6 && group.fragmentationRisk < 0.4;

    return { omegaG, pG, gatePass };
  }

  // Get current field energy for venue recommendations
  getFieldEnergyContext(): { energy: number; slope: number; preferredVibes: Vibe[] } {
    const person = this.state.personState;
    const recentVenues = Array.from(this.state.venueEnergies.values());
    const avgSlope = recentVenues.length > 0 
      ? recentVenues.reduce((sum, v) => sum + v.slope, 0) / recentVenues.length 
      : 0;

    // Recommend vibes based on current state
    const preferredVibes: Vibe[] = [];
    if (person.energy > 0.7) preferredVibes.push('hype', 'social');
    if (person.momentum > 0.5) preferredVibes.push('flowing', 'open');
    if (person.friendsPresent > 0.5) preferredVibes.push('social');
    else if (person.friendsPresent < 0.2) preferredVibes.push('solo', 'chill');

    return {
      energy: person.energy,
      slope: avgSlope,
      preferredVibes: preferredVibes.length > 0 ? preferredVibes : [person.vibe]
    };
  }

  // Subscribe to state changes
  onStateChange(callback: (state: FieldIntegrationState) => void) {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  private getCurrentGroup(): GroupState | undefined {
    // Return the most relevant group (highest energy * cohesion)
    let bestGroup: GroupState | undefined;
    let bestScore = 0;

    for (const group of this.state.groupStates.values()) {
      const score = group.energy * group.cohesion;
      if (score > bestScore) {
        bestScore = score;
        bestGroup = group;
      }
    }

    return bestGroup;
  }

  private notifyStateChange() {
    this.state.lastUpdate = Date.now();
    this.updateCallbacks.forEach(callback => callback(this.state));
  }

  getState(): FieldIntegrationState {
    return { ...this.state };
  }
}

// Global instance for easy access across the app
export const fieldIntegration = new FieldIntegrationEngine();