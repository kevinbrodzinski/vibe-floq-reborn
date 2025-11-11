import React, { useState, useEffect, useRef } from 'react';
import { FieldMapBase } from '@/components/maps/FieldMapBase';
import { FieldLocationProvider } from '@/components/field/contexts/FieldLocationContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

// Mock person data generator
interface MockPerson {
  id: string;
  lat: number;
  lng: number;
  vibe?: string;
  isFriend?: boolean;
  velocity: { lat: number; lng: number };
  targetIndex: number;
  patternPhase: number; // For figure-8, spiral patterns
}

type MovementPattern = 'convergence' | 'figure-8' | 'spiral' | 'random-walk';

// Convergence patterns to trigger effects
const CONVERGENCE_POINTS = [
  { lat: 37.7749, lng: -122.4194 }, // SF center
  { lat: 37.7750, lng: -122.4195 },
  { lat: 37.7748, lng: -122.4193 },
  { lat: 37.7751, lng: -122.4196 },
  { lat: 37.7747, lng: -122.4192 },
];

const VIBES = ['🎉', '🎵', '🍕', '☕', '🎨'];

function createMockPerson(index: number): MockPerson {
  const point = CONVERGENCE_POINTS[index % CONVERGENCE_POINTS.length];
  const offset = 0.002 * (Math.random() - 0.5);
  
  return {
    id: `mock-person-${index}`,
    lat: point.lat + offset,
    lng: point.lng + offset,
    vibe: VIBES[index % VIBES.length],
    isFriend: Math.random() > 0.5,
    velocity: { 
      lat: (Math.random() - 0.5) * 0.0001, 
      lng: (Math.random() - 0.5) * 0.0001 
    },
    targetIndex: Math.floor(Math.random() * CONVERGENCE_POINTS.length),
    patternPhase: Math.random() * Math.PI * 2 // Random starting phase
  };
}

// Pattern movement functions
function moveFigure8(person: MockPerson, time: number): Partial<MockPerson> {
  const center = { lat: 37.7749, lng: -122.4194 };
  const radius = 0.0015;
  const speed = 0.001;
  
  const phase = person.patternPhase + time * speed;
  const lat = center.lat + radius * Math.sin(phase);
  const lng = center.lng + radius * Math.sin(2 * phase) / 2;
  
  return { lat, lng, patternPhase: phase };
}

function moveSpiral(person: MockPerson, time: number): Partial<MockPerson> {
  const center = { lat: 37.7749, lng: -122.4194 };
  const speed = 0.0008;
  
  const phase = person.patternPhase + time * speed;
  const radius = 0.0005 + (phase % (Math.PI * 4)) * 0.0002;
  const lat = center.lat + radius * Math.cos(phase);
  const lng = center.lng + radius * Math.sin(phase);
  
  return { lat, lng, patternPhase: phase };
}

function moveRandomWalk(person: MockPerson): Partial<MockPerson> {
  const step = 0.0002;
  const randomAngle = Math.random() * Math.PI * 2;
  
  const lat = person.lat + Math.cos(randomAngle) * step;
  const lng = person.lng + Math.sin(randomAngle) * step;
  
  // Keep within bounds
  const bounds = {
    minLat: 37.7730,
    maxLat: 37.7770,
    minLng: -122.4210,
    maxLng: -122.4180
  };
  
  return {
    lat: Math.max(bounds.minLat, Math.min(bounds.maxLat, lat)),
    lng: Math.max(bounds.minLng, Math.min(bounds.maxLng, lng))
  };
}

function moveConvergence(person: MockPerson): Partial<MockPerson> {
  const target = CONVERGENCE_POINTS[person.targetIndex];
  const dx = target.lng - person.lng;
  const dy = target.lat - person.lat;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // If close to target, pick a new one
  if (distance < 0.0005) {
    const newTargetIndex = Math.floor(Math.random() * CONVERGENCE_POINTS.length);
    return { targetIndex: newTargetIndex };
  }

  // Move towards target with some randomness
  const speed = 0.00008;
  const randomness = 0.00003;
  const newLat = person.lat + (dy / distance) * speed + (Math.random() - 0.5) * randomness;
  const newLng = person.lng + (dx / distance) * speed + (Math.random() - 0.5) * randomness;

  return { lat: newLat, lng: newLng };
}

export const AnimationDemoPage: React.FC = () => {
  const [people, setPeople] = useState<MockPerson[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [personCount, setPersonCount] = useState(3);
  const [pattern, setPattern] = useState<MovementPattern>('convergence');
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Initialize people
  const initializePeople = () => {
    const newPeople = Array.from({ length: personCount }, (_, i) => createMockPerson(i));
    setPeople(newPeople);
  };

  // Animation loop
  useEffect(() => {
    if (!isRunning || people.length === 0) return;

    const animate = () => {
      timeRef.current += 0.016; // ~60fps
      
      setPeople(prev => prev.map(person => {
        let updates: Partial<MockPerson> = {};
        
        switch (pattern) {
          case 'figure-8':
            updates = moveFigure8(person, timeRef.current);
            break;
          case 'spiral':
            updates = moveSpiral(person, timeRef.current);
            break;
          case 'random-walk':
            updates = moveRandomWalk(person);
            break;
          case 'convergence':
          default:
            updates = moveConvergence(person);
            break;
        }

        return { ...person, ...updates };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, people.length, pattern]);

  // Convert to format expected by map
  const mockFloqs = people.map(p => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    primary_vibe: p.vibe,
    member_count: 1,
    isFriend: p.isFriend
  }));

  return (
    <FieldLocationProvider friendIds={[]}>
      <div className="relative h-screen w-full">
        {/* Map */}
        <FieldMapBase 
          visible={true}
          floqs={mockFloqs}
          realtime={true}
        />

      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg max-w-sm z-50">
        <h2 className="text-lg font-semibold mb-3">Animation Demo Controls</h2>
        
        {/* Movement Pattern */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            Movement Pattern
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['convergence', 'figure-8', 'spiral', 'random-walk'] as MovementPattern[]).map((p) => (
              <Button
                key={p}
                onClick={() => setPattern(p)}
                variant={pattern === p ? 'default' : 'outline'}
                size="sm"
                disabled={isRunning}
                className="text-xs"
              >
                {p === 'figure-8' ? '∞ Figure-8' :
                 p === 'spiral' ? '🌀 Spiral' :
                 p === 'random-walk' ? '🎲 Random' :
                 '🎯 Converge'}
              </Button>
            ))}
          </div>
        </div>

        {/* Person Count */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            People Count: {personCount}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={personCount}
            onChange={(e) => setPersonCount(Number(e.target.value))}
            disabled={isRunning}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (!isRunning && people.length === 0) {
                initializePeople();
              }
              setIsRunning(!isRunning);
            }}
            variant="default"
            size="sm"
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>

          <Button
            onClick={() => {
              setIsRunning(false);
              setPeople([]);
              initializePeople();
            }}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-muted rounded text-xs space-y-1">
          <p className="font-medium">Expected Effects:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✨ <strong>Aurora:</strong> Zoom 12-14, convergence zones</li>
            <li>⚡ <strong>Lightning:</strong> High confidence convergence</li>
            <li>🧭 <strong>Compass:</strong> Zoom 12+, 1+ clusters</li>
            <li>💫 <strong>Cascades:</strong> Proximity ripples</li>
            <li>🌊 <strong>Flow:</strong> Movement trails at zoom 11+</li>
          </ul>
          <p className="mt-2 pt-2 border-t">
            <strong>Active:</strong> {people.length} people moving
          </p>
        </div>
      </div>

      {/* Zoom Instructions */}
      {people.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-full px-4 py-2 text-sm z-50">
          💡 Zoom to 12-14 to see aurora & compass effects
        </div>
      )}
      </div>
    </FieldLocationProvider>
  );
};
