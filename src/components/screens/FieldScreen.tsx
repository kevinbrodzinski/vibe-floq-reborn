import { useState } from "react";

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

export const FieldScreen = () => {
  const [people] = useState<Person[]>([
    { id: "1", name: "Julia", x: 25, y: 30, color: "hsl(180 70% 60%)", vibe: "chill" },
    { id: "2", name: "Kayla", x: 35, y: 50, color: "hsl(240 70% 60%)", vibe: "social" },
    { id: "3", name: "Leo", x: 70, y: 35, color: "hsl(200 70% 60%)", vibe: "flowing" },
    { id: "4", name: "Kayla", x: 65, y: 65, color: "hsl(240 70% 60%)", vibe: "social" },
    { id: "5", name: "Leo", x: 75, y: 80, color: "hsl(200 70% 60%)", vibe: "open" },
  ]);

  const [floqEvents] = useState<FloqEvent[]>([
    { id: "1", title: "car nightride", x: 50, y: 45, size: 80, participants: 3, vibe: "hype" },
    { id: "2", title: "Gailleo's", x: 20, y: 70, size: 60, participants: 8, vibe: "social" },
    { id: "3", title: "Circa", x: 15, y: 85, size: 40, participants: 4, vibe: "chill" },
  ]);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-light">1</span>
          <span className="text-lg text-muted-foreground">Downtown</span>
        </div>
        <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          floq
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-secondary overflow-hidden">
          <div className="w-full h-full bg-muted-foreground/20"></div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute top-20 left-0 right-0 z-10 text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-muted-foreground">You're in:</span>
          <span className="text-xl">✨</span>
          <span className="text-primary font-medium">Social Flow</span>
        </div>
      </div>

      {/* Field Map */}
      <div className="relative h-full pt-32 pb-32">
        {/* People on the field */}
        {people.map((person) => (
          <div
            key={person.id}
            className="absolute transition-all duration-500 cursor-pointer hover:scale-110"
            style={{
              left: `${person.x}%`,
              top: `${person.y}%`,
              transform: "translate(-50%, -50%)",
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

        {/* Floq Events */}
        {floqEvents.map((event) => (
          <div
            key={event.id}
            className="absolute transition-all duration-500 cursor-pointer hover:scale-105"
            style={{
              left: `${event.x}%`,
              top: `${event.y}%`,
              transform: "translate(-50%, -50%)",
              width: `${event.size}px`,
              height: `${event.size}px`,
            }}
          >
            <div className="relative w-full h-full">
              {/* Outer ripple */}
              <div className="absolute inset-0 border-2 border-primary/30 rounded-full animate-pulse"></div>
              {/* Inner circle */}
              <div className="absolute inset-4 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse-glow">
                <div className="w-6 h-6 bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="text-sm text-center mt-2 text-foreground font-medium">
              {event.title}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Card */}
      <div className="absolute bottom-24 left-4 right-4 z-10">
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium">3 friends are vibing at</h3>
            <h2 className="text-xl font-bold text-primary mt-1">Warehouse — join?</h2>
          </div>
          
          <div className="flex space-x-3">
            <button className="flex-1 bg-gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
              <span className="text-lg">🧭</span>
              <span>Let Pulse Guide Me</span>
            </button>
            <button className="flex-1 bg-secondary/50 text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
              <span className="text-lg">✨</span>
              <span>Create New Floq</span>
            </button>
            <button className="bg-accent/20 text-accent py-3 px-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              <span className="text-lg">🎛️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};