import type { ContextFactWithId } from './types';

export interface GraphNode {
  id: string;
  type: 'temporal' | 'spatial' | 'social' | 'behavioral';
  data: any;
  confidence: number;
  timestamp: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'causal' | 'temporal' | 'spatial' | 'social';
  weight: number;
  confidence: number;
}

export interface ContextSynthesis {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    factCount: number;
    synthesizedAt: number;
    confidence: number;
  };
}

export interface GraphVersion {
  versionId: string;
  parentId: string | null;
  synthesis: ContextSynthesis;
  timestamp: number;
  signature: string;
}

/**
 * Context Synthesis Graph - Builds relational context from facts
 * Creates temporal, spatial, social, and behavioral nodes with connections
 */
export class ContextSynthesisGraph {
  private versions: GraphVersion[] = [];
  private head: GraphVersion | null = null;

  async synthesize(facts: ContextFactWithId[]): Promise<ContextSynthesis> {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    // Build temporal nodes (time-based patterns)
    const temporalNodes = this.createTemporalNodes(facts);
    temporalNodes.forEach(n => nodes.set(n.id, n));

    // Build spatial nodes (location-based patterns)  
    const spatialNodes = this.createSpatialNodes(facts);
    spatialNodes.forEach(n => nodes.set(n.id, n));

    // Build social nodes (interaction patterns)
    const socialNodes = this.createSocialNodes(facts);
    socialNodes.forEach(n => nodes.set(n.id, n));

    // Build behavioral nodes (action patterns)
    const behavioralNodes = this.createBehavioralNodes(facts);
    behavioralNodes.forEach(n => nodes.set(n.id, n));

    // Connect nodes with edges
    edges.push(...this.createTemporalEdges(nodes));
    edges.push(...this.createCausalEdges(nodes, facts));
    edges.push(...this.createSocialEdges(nodes));
    edges.push(...this.createSpatialEdges(nodes));

    const synthesis: ContextSynthesis = {
      nodes: Array.from(nodes.values()),
      edges,
      metadata: {
        factCount: facts.length,
        synthesizedAt: Date.now(),
        confidence: this.calculateConfidence(nodes, edges)
      }
    };

    // Store version for non-destructive updates
    const version = await this.createVersion(synthesis);
    this.versions.push(version);
    this.head = version;

    return synthesis;
  }

  private createTemporalNodes(facts: ContextFactWithId[]): GraphNode[] {
    const timeSlots = new Map<string, ContextFactWithId[]>();
    
    // Group facts by hour slots
    facts.forEach(fact => {
      const hour = new Date(fact.timestamp).getHours();
      const timeSlot = `hour_${hour}`;
      
      if (!timeSlots.has(timeSlot)) {
        timeSlots.set(timeSlot, []);
      }
      timeSlots.get(timeSlot)!.push(fact);
    });

    return Array.from(timeSlots.entries()).map(([timeSlot, slotFacts]) => ({
      id: `temporal_${timeSlot}`,
      type: 'temporal' as const,
      data: {
        timeSlot,
        factCount: slotFacts.length,
        dominantTypes: this.getDominantTypes(slotFacts),
        patterns: this.extractTemporalPatterns(slotFacts)
      },
      confidence: Math.min(0.9, slotFacts.length / 10),
      timestamp: Date.now()
    }));
  }

  private createSpatialNodes(facts: ContextFactWithId[]): GraphNode[] {
    const venues = new Map<string, ContextFactWithId[]>();
    
    facts.forEach(fact => {
      // Type guard to ensure fact is venue transition
      if (fact.type === 'venue_transition') {
        const venue = fact.data.to;
        if (venue && fact.type === 'venue_transition') {
          if (!venues.has(venue)) {
            venues.set(venue, []);
          }
          venues.get(venue)!.push(fact);
        }
      }
    });

    return Array.from(venues.entries()).map(([venue, venueFacts]) => ({
      id: `spatial_${venue}`,
      type: 'spatial' as const,
      data: {
        venue,
        visitCount: venueFacts.length,
        averageDwell: this.calculateAverageDwell(venueFacts),
        energyImpact: this.calculateEnergyImpact(venueFacts)
      },
      confidence: Math.min(0.9, venueFacts.length / 5),
      timestamp: Date.now()
    }));
  }

  private createSocialNodes(facts: ContextFactWithId[]): GraphNode[] {
    // For now, create placeholder social nodes
    // Future: integrate with floq/social interaction data
    return [];
  }

  private createBehavioralNodes(facts: ContextFactWithId[]): GraphNode[] {
    const behaviors = new Map<string, ContextFactWithId[]>();
    
    facts.forEach(fact => {
      const behaviorType = `${fact.type}_behavior`;
      if (!behaviors.has(behaviorType)) {
        behaviors.set(behaviorType, []);
      }
      behaviors.get(behaviorType)!.push(fact);
    });

    return Array.from(behaviors.entries()).map(([behavior, behaviorFacts]) => ({
      id: `behavioral_${behavior}`,
      type: 'behavioral' as const,
      data: {
        behavior,
        frequency: behaviorFacts.length,
        recentTrend: this.calculateTrend(behaviorFacts),
        confidence: this.calculateBehaviorConfidence(behaviorFacts)
      },
      confidence: Math.min(0.9, behaviorFacts.length / 8),
      timestamp: Date.now()
    }));
  }

  private createTemporalEdges(nodes: Map<string, GraphNode>): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const temporalNodes = Array.from(nodes.values()).filter(n => n.type === 'temporal');
    
    // Connect sequential time slots
    temporalNodes.sort((a, b) => {
      const hourA = parseInt(a.id.split('_')[1]);
      const hourB = parseInt(b.id.split('_')[1]);
      return hourA - hourB;
    });

    for (let i = 1; i < temporalNodes.length; i++) {
      edges.push({
        from: temporalNodes[i - 1].id,
        to: temporalNodes[i].id,
        type: 'temporal',
        weight: 0.5,
        confidence: 0.8
      });
    }

    return edges;
  }

  private createCausalEdges(nodes: Map<string, GraphNode>, facts: ContextFactWithId[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    // Look for causal relationships in sequential facts
    for (let i = 1; i < facts.length; i++) {
      const prev = facts[i - 1];
      const curr = facts[i];
      
      // If facts are close in time, they might be causally related
      const timeDiff = curr.timestamp - prev.timestamp;
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        const weight = Math.max(0.1, 1 - (timeDiff / (5 * 60 * 1000)));
        
        edges.push({
          from: `behavioral_${prev.type}_behavior`,
          to: `behavioral_${curr.type}_behavior`,
          type: 'causal',
          weight,
          confidence: weight * 0.7
        });
      }
    }

    return edges;
  }

  private createSocialEdges(nodes: Map<string, GraphNode>): GraphEdge[] {
    // Placeholder for social edges
    return [];
  }

  private createSpatialEdges(nodes: Map<string, GraphNode>): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const spatialNodes = Array.from(nodes.values()).filter(n => n.type === 'spatial');
    
    // Connect related venues (basic clustering)
    spatialNodes.forEach((nodeA, i) => {
      spatialNodes.slice(i + 1).forEach(nodeB => {
        const similarity = this.calculateVenueSimilarity(nodeA.data, nodeB.data);
        if (similarity > 0.3) {
          edges.push({
            from: nodeA.id,
            to: nodeB.id,
            type: 'spatial',
            weight: similarity,
            confidence: similarity * 0.6
          });
        }
      });
    });

    return edges;
  }

  private getDominantTypes(facts: ContextFactWithId[]): string[] {
    const counts = new Map<string, number>();
    facts.forEach(f => {
      counts.set(f.type, (counts.get(f.type) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  private extractTemporalPatterns(facts: ContextFactWithId[]): any {
    return {
      dominantVibes: this.getDominantVibes(facts),
      activityLevel: facts.length / 10, // Normalize activity
      consistency: this.calculateConsistency(facts)
    };
  }

  private getDominantVibes(facts: ContextFactWithId[]): any[] {
    const vibes = facts
      .filter(f => f.type === 'vibe_correction')
      .map(f => {
        if (f.type === 'vibe_correction') {
          return f.data.to;
        }
        return null;
      })
      .filter((v): v is string => v !== null);
    
    const vibeCounts = new Map<string, number>();
    vibes.forEach(v => {
      if (v) {
        vibeCounts.set(v, (vibeCounts.get(v) || 0) + 1);
      }
    });
    
    return Array.from(vibeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
  }

  private calculateConsistency(facts: ContextFactWithId[]): number {
    if (facts.length < 2) return 0;
    
    const types = facts.map(f => f.type);
    const uniqueTypes = new Set(types).size;
    return 1 - (uniqueTypes / facts.length);
  }

  private calculateAverageDwell(facts: ContextFactWithId[]): number {
    // Placeholder - calculate from venue transition facts
    return 30 * 60 * 1000; // 30 minutes default
  }

  private calculateEnergyImpact(facts: ContextFactWithId[]): number {
    // Placeholder - analyze energy transitions around venue visits
    return 0.5;
  }

  private calculateTrend(facts: ContextFactWithId[]): 'increasing' | 'decreasing' | 'stable' {
    if (facts.length < 3) return 'stable';
    
    const recent = facts.slice(-5);
    const older = facts.slice(-10, -5);
    
    return recent.length > older.length ? 'increasing' : 
           recent.length < older.length ? 'decreasing' : 'stable';
  }

  private calculateBehaviorConfidence(facts: ContextFactWithId[]): number {
    return Math.min(0.9, facts.length / 10);
  }

  private calculateVenueSimilarity(venueA: any, venueB: any): number {
    // Placeholder similarity calculation
    // Future: use venue type, category, or semantic similarity
    return Math.random() * 0.5; // Random for now
  }

  private calculateConfidence(nodes: Map<string, GraphNode>, edges: GraphEdge[]): number {
    if (nodes.size === 0) return 0;
    
    const avgNodeConfidence = Array.from(nodes.values())
      .reduce((sum, node) => sum + node.confidence, 0) / nodes.size;
    
    const avgEdgeConfidence = edges.length > 0 
      ? edges.reduce((sum, edge) => sum + edge.confidence, 0) / edges.length
      : 0;
    
    return (avgNodeConfidence * 0.7) + (avgEdgeConfidence * 0.3);
  }

  private async createVersion(synthesis: ContextSynthesis): Promise<GraphVersion> {
    const versionId = crypto.randomUUID();
    const signature = await this.signSynthesis(synthesis);
    
    return {
      versionId,
      parentId: this.head?.versionId || null,
      synthesis,
      timestamp: Date.now(),
      signature
    };
  }

  private async signSynthesis(synthesis: ContextSynthesis): Promise<string> {
    const content = JSON.stringify({
      nodeCount: synthesis.nodes.length,
      edgeCount: synthesis.edges.length,
      confidence: synthesis.metadata.confidence,
      timestamp: synthesis.metadata.synthesizedAt
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  getLatestSynthesis(): ContextSynthesis | null {
    return this.head?.synthesis || null;
  }

  getVersionHistory(): GraphVersion[] {
    return [...this.versions];
  }
}