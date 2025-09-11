// Core vibe engine types - unified signal architecture
export interface SignalSnapshot {
  timestamp: number;
  sources: {
    location?: LocationSignal;
    movement?: MovementSignal;
    temporal?: TemporalSignal;
    device?: DeviceSignal;
    behavioral?: BehavioralSignal;
  };
  quality: number; // 0-1 overall quality score
  availability: Record<string, boolean>; // which signals are available
}

export interface LocationSignal {
  venue?: {
    name: string;
    category: string;
    confidence: number;
  };
  coordinates?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  urbanDensity: number; // 0-1 (rural to urban)
  timeAtLocation: number; // minutes
}

export interface MovementSignal {
  speed: number; // m/s
  activity: 'stationary' | 'walking' | 'transit' | 'unknown';
  stability: number; // 0-1 movement consistency
  heading?: number; // degrees, optional
}

export interface TemporalSignal {
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  isWeekend: boolean;
  timeInCurrentContext: number; // minutes in current activity/location
}

export interface DeviceSignal {
  batteryLevel: number; // 0-1
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
  isCharging: boolean;
  brightness?: number; // 0-1, if available
}

export interface BehavioralSignal {
  venueSequence: Array<{
    venue: string;
    category: string;
    duration: number; // minutes
    timestamp: number;
  }>;
  patternMatch?: {
    type: 'social-night' | 'exploration' | 'routine' | 'adventure';
    confidence: number;
  };
  transitionType?: 'planned' | 'spontaneous' | 'routine';
}

// Enhanced VibePoint with confidence and sources
export interface VibePoint {
  t: number | Date;
  energy: number; // 0-1
  confidence: number; // 0-1 how confident we are in this reading
  sources: string[]; // which signals contributed ['location', 'movement', etc]
  valence?: number; // 0-1 emotional valence (optional)
  breakdown?: { // how much each signal type contributed
    primary: number; // location, movement, temporal, device
    behavioral: number;
    environmental: number;
    social: number;
  };
}

// Signal collector interface
export interface SignalCollector {
  readonly name: string;
  isAvailable(): boolean;
  collect(): Promise<any | null>;
  getQuality(): number; // 0-1
}

// Orchestrator state
export interface VibeEngineState {
  currentVibe: VibePoint | null;
  recentSnapshots: SignalSnapshot[];
  signalHealth: Record<string, number>; // per-signal quality scores
  lastUpdate: number;
}