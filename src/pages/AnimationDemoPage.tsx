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
}

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
    targetIndex: Math.floor(Math.random() * CONVERGENCE_POINTS.length)
  };
}

export const AnimationDemoPage: React.FC = () => {
  const [people, setPeople] = useState<MockPerson[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [personCount, setPersonCount] = useState(3);
  const animationRef = useRef<number>();

  // Initialize people
  const initializePeople = () => {
    const newPeople = Array.from({ length: personCount }, (_, i) => createMockPerson(i));
    setPeople(newPeople);
  };

  // Animation loop
  useEffect(() => {
    if (!isRunning || people.length === 0) return;

    const animate = () => {
      setPeople(prev => prev.map(person => {
        const target = CONVERGENCE_POINTS[person.targetIndex];
        const dx = target.lng - person.lng;
        const dy = target.lat - person.lat;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If close to target, pick a new one
        if (distance < 0.0005) {
          const newTargetIndex = Math.floor(Math.random() * CONVERGENCE_POINTS.length);
          return { ...person, targetIndex: newTargetIndex };
        }

        // Move towards target with some randomness
        const speed = 0.00008;
        const randomness = 0.00003;
        const newLat = person.lat + (dy / distance) * speed + (Math.random() - 0.5) * randomness;
        const newLng = person.lng + (dx / distance) * speed + (Math.random() - 0.5) * randomness;

        return {
          ...person,
          lat: newLat,
          lng: newLng,
        };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, people.length]);

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
