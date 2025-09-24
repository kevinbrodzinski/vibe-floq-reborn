import { useState, useEffect } from "react";
import { Clock, MapPin, Navigation, Users, CheckCircle, AlertCircle, Phone } from "lucide-react";

interface PlanStop {
  id: string;
  title: string;
  venue: string;
  startTime: string;
  endTime: string;
  location: string;
  participants: string[];
  status: 'upcoming' | 'current' | 'completed' | 'delayed';
  actualArrival?: number;
  actualDeparture?: number;
}

interface PlanExecutionTrackerProps {
  stops: PlanStop[];
  currentTime: string;
  groupLocation?: string;
}

export const PlanExecutionTracker = ({ stops, currentTime, groupLocation }: PlanExecutionTrackerProps) => {
  const [trackedStops, setTrackedStops] = useState<PlanStop[]>(stops);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Update stop statuses based on current time
    const currentHour = parseInt(currentTime.split(':')[0]);
    const currentMinutes = currentHour * 60 + parseInt(currentTime.split(':')[1]);

    const updatedStops = trackedStops.map(stop => {
      const startMinutes = parseInt(stop.startTime.split(':')[0]) * 60 + parseInt(stop.startTime.split(':')[1]);
      const endMinutes = parseInt(stop.endTime.split(':')[0]) * 60 + parseInt(stop.endTime.split(':')[1]);

      if (currentMinutes < startMinutes - 30) {
        return { ...stop, status: 'upcoming' as const };
      } else if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
        return { ...stop, status: 'upcoming' as const };
      } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return { ...stop, status: 'current' as const };
      } else if (currentMinutes >= endMinutes) {
        return { ...stop, status: 'completed' as const };
      }
      return stop;
    });

    setTrackedStops(updatedStops);
  }, [currentTime, trackedStops]);

  // Mock real-time group updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate friend arrivals/departures
      if (Math.random() > 0.8) {
        const messages = [
          "Sam just arrived at Bestia 📍",
          "Alex is running 10 minutes late",
          "Emma joined the group at EP & LP 🎉",
          "Traffic delay - pushing back timeline by 15 min",
          "Table ready at next stop! 🍽️"
        ];
        const newNotification = messages[Math.floor(Math.random() * messages.length)]; 
        setNotifications(prev => [newNotification, ...prev].slice(0, 3));
        
        setTimeout(() => {
          setNotifications(prev => prev.slice(0, -1));
        }, 5000);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'hsl(120 70% 60%)';
      case 'current': return 'hsl(280 70% 60%)';
      case 'upcoming': return 'hsl(200 70% 60%)';
      case 'delayed': return 'hsl(0 70% 60%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'current': return <Navigation className="w-4 h-4" />;
      case 'delayed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCurrentStop = () => {
    return trackedStops.find(stop => stop.status === 'current');
  };

  const getNextStop = () => {
    return trackedStops.find(stop => stop.status === 'upcoming');
  };

  const currentStop = getCurrentStop();
  const nextStop = getNextStop();

  return (
    <div className="space-y-4">
      {/* Live notifications */}
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="bg-primary/90 text-primary-foreground rounded-2xl p-3 animate-fade-in glow-primary"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="text-sm font-medium">{notification}</div>
        </div>
      ))}

      {/* Current status header */}
      <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Live Plan Tracker</h3>
          <div className="text-sm text-muted-foreground">{currentTime}</div>
        </div>

        {currentStop ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div style={{ color: getStatusColor(currentStop.status) }}>
                {getStatusIcon(currentStop.status)}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Currently at {currentStop.title}</h4>
                <p className="text-sm text-muted-foreground">{currentStop.location}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-accent">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{currentStop.participants.length} here</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Until {currentStop.endTime}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 bg-accent/20 rounded-full hover:bg-accent/30 transition-colors">
                  <Phone className="w-4 h-4 text-accent" />
                </button>
                <button className="p-2 bg-primary/20 rounded-full hover:bg-primary/30 transition-colors">
                  <Navigation className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <div className="text-sm">Plan not started yet</div>
          </div>
        )}
      </div>

      {/* Next stop preview */}
      {nextStop && (
        <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Up next</div>
              <h4 className="font-semibold text-foreground">{nextStop.title}</h4>
              <div className="flex items-center space-x-4 text-sm text-accent mt-1">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{nextStop.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{nextStop.startTime}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <button className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-2xl text-sm font-medium hover:scale-105 transition-all duration-300">
                Navigate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full timeline overview */}
      <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/30">
        <h4 className="font-semibold text-foreground mb-3">Tonight's Progress</h4>
        
        <div className="space-y-3">
          {trackedStops.map((stop, index) => (
            <div key={stop.id} className="flex items-center space-x-3">
              <div style={{ color: getStatusColor(stop.status) }}>
                {getStatusIcon(stop.status)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-medium ${
                      stop.status === 'current' ? 'text-primary' : 'text-foreground'
                    }`}>
                      {stop.title}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {stop.startTime} - {stop.endTime}
                    </div>
                  </div>
                  
                  <div className="text-xs text-accent">
                    {stop.participants.length} going
                  </div>
                </div>
              </div>
              
              {index < trackedStops.length - 1 && (
                <div className="w-px h-6 bg-border/50" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-accent/20 text-accent py-3 rounded-2xl text-sm font-medium transition-all duration-300 hover:scale-105 hover:bg-accent/30">
          Adjust Timeline
        </button>
        <button className="bg-primary/20 text-primary py-3 rounded-2xl text-sm font-medium transition-all duration-300 hover:scale-105 hover:bg-primary/30">
          Group Message
        </button>
      </div>
    </div>
  );
};