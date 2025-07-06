import { useState, useRef, useCallback } from "react";
import { Clock, MapPin, Users, Trash2, Edit, Vote } from "lucide-react";

interface PlanStop {
  id: string;
  title: string;
  venue: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  vibeMatch: number;
  participants: string[];
  status: 'confirmed' | 'suggested' | 'voted';
  votes: { userId: string; vote: 'yes' | 'no' | 'maybe' }[];
  createdBy: string;
  color: string;
}

interface TimelineEditorProps {
  stops: PlanStop[];
  onStopsReorder: (stops: PlanStop[]) => void;
  onStopRemove: (stopId: string) => void;
  onStopVote: (stopId: string, vote: 'yes' | 'no' | 'maybe') => void;
  onStopAdd?: (timeSlot: string) => void;
}

export const TimelineEditor = ({ 
  stops, 
  onStopsReorder, 
  onStopRemove, 
  onStopVote,
  onStopAdd 
}: TimelineEditorProps) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const draggedStopRef = useRef<PlanStop | null>(null);

  const timeSlots = [
    "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00"
  ];

  const getStopAtTime = (time: string) => {
    return stops.find(stop => stop.startTime === time);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'hsl(120 70% 60%)';
      case 'voted': return 'hsl(60 70% 60%)';
      case 'suggested': return 'hsl(280 70% 60%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  const getVoteCount = (stop: PlanStop, voteType: 'yes' | 'no' | 'maybe') => {
    return stop.votes.filter(v => v.vote === voteType).length;
  };

  const getUserVote = (stop: PlanStop) => {
    return stop.votes.find(v => v.userId === "you")?.vote;
  };

  const handleDragStart = (e: React.DragEvent, stop: PlanStop) => {
    draggedStopRef.current = stop;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stop.id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedStopRef.current) return;

    const draggedStop = draggedStopRef.current;
    const currentIndex = stops.findIndex(s => s.id === draggedStop.id);
    
    if (currentIndex === targetIndex) return;

    const newStops = [...stops];
    newStops.splice(currentIndex, 1);
    newStops.splice(targetIndex, 0, draggedStop);
    
    // Update times based on new positions
    const updatedStops = newStops.map((stop, index) => ({
      ...stop,
      startTime: timeSlots[index] || stop.startTime,
      endTime: timeSlots[index + 1] || stop.endTime
    }));

    onStopsReorder(updatedStops);
    draggedStopRef.current = null;
  };

  const handleVenueDropFromLibrary = useCallback((e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    try {
      const venueData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (venueData && onStopAdd) {
        onStopAdd(timeSlot);
      }
    } catch (error) {
      console.error('Error parsing dropped venue data:', error);
    }
  }, [onStopAdd]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Tonight's Timeline</h3>
        <div className="text-sm text-muted-foreground">
          Drag to reorder • Drop venues here
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-primary opacity-50" />
        
        <div className="space-y-4">
          {timeSlots.map((timeSlot, index) => {
            const stop = getStopAtTime(timeSlot);
            const isDropZone = dragOverIndex === index;
            
            return (
              <div
                key={timeSlot}
                className="relative"
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => stop ? handleDrop(e, index) : handleVenueDropFromLibrary(e, timeSlot)}
              >
                {/* Time marker */}
                <div className="flex items-center space-x-4">
                  <div className="relative z-10 w-16 text-center">
                    <div className="bg-card/90 backdrop-blur-xl rounded-full px-3 py-2 border border-border/30">
                      <span className="text-sm font-medium text-foreground">{timeSlot}</span>
                    </div>
                  </div>
                  
                  {stop ? (
                    /* Existing stop */
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, stop)}
                      className={`flex-1 bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30 cursor-grab transition-all duration-300 hover:scale-[1.02] hover:glow-secondary ${
                        selectedStop === stop.id ? 'ring-2 ring-primary glow-primary' : ''
                      } ${isDropZone ? 'ring-2 ring-accent' : ''}`}
                      onClick={() => setSelectedStop(selectedStop === stop.id ? null : stop.id)}
                      style={{ borderLeftColor: stop.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-foreground">{stop.title}</h4>
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getStatusColor(stop.status) }}
                            />
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{stop.description}</p>
                          
                          <div className="flex items-center space-x-4 text-xs text-accent">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{stop.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{stop.startTime} - {stop.endTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{stop.participants.length} going</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="text-right text-sm">
                            <div className="text-primary font-medium">{stop.vibeMatch}% match</div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStopRemove(stop.id);
                            }}
                            className="p-1 rounded-full hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Voting interface */}
                      {selectedStop === stop.id && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <Vote className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Votes:</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-green-400">👍 {getVoteCount(stop, 'yes')}</span>
                                <span className="text-yellow-400">🤷 {getVoteCount(stop, 'maybe')}</span>
                                <span className="text-red-400">👎 {getVoteCount(stop, 'no')}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {(['yes', 'maybe', 'no'] as const).map((voteType) => (
                                <button
                                  key={voteType}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStopVote(stop.id, voteType);
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                                    getUserVote(stop) === voteType
                                      ? 'bg-primary text-primary-foreground glow-primary'
                                      : 'bg-secondary/40 text-secondary-foreground hover:bg-secondary/60'
                                  }`}
                                >
                                  {voteType === 'yes' ? '👍' : voteType === 'maybe' ? '🤷' : '👎'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty slot - drop zone */
                    <div
                      className={`flex-1 border-2 border-dashed border-border/50 rounded-2xl p-6 transition-all duration-300 ${
                        isDropZone ? 'border-primary bg-primary/10 glow-primary' : 'hover:border-border hover:bg-card/30'
                      }`}
                    >
                      <div className="text-center text-muted-foreground">
                        <div className="text-sm">Drop venue here or</div>
                        <button 
                          onClick={() => onStopAdd?.(timeSlot)}
                          className="text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                          + Add stop
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};