import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocialContext } from '@/hooks/useSocialContext';
import { useTimeSyncContext } from './TimeSyncProvider';

interface FloqAIProps {
  isVisible: boolean;
  onClose: () => void;
}

export const FloqAI = ({ isVisible, onClose }: FloqAIProps) => {
  const { socialContext } = useSocialContext();
  const { timeState, getTimeMessage } = useTimeSyncContext();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'ai'; message: string }>>([]);
  
  const recognition = useRef<SpeechRecognition | null>(null);
  const synthesis = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognitionConstructor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognition.current = new SpeechRecognitionConstructor();
      recognition.current.continuous = false;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (event.results[0].isFinal) {
          handleVoiceInput(transcript);
        }
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthesis.current = window.speechSynthesis;
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (synthesis.current) {
        synthesis.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && socialContext.contextualPrompts.length > 0) {
      // Surface with contextual prompt
      const prompt = socialContext.contextualPrompts[0];
      setCurrentMessage(prompt);
      speakMessage(prompt);
    }
  }, [isVisible, socialContext.contextualPrompts]);

  const handleVoiceInput = async (input: string) => {
    setConversation(prev => [...prev, { role: 'user', message: input }]);
    
    // Simple contextual AI responses (in real app, this would call an AI service)
    const aiResponse = generateContextualResponse(input);
    setCurrentMessage(aiResponse);
    setConversation(prev => [...prev, { role: 'ai', message: aiResponse }]);
    
    speakMessage(aiResponse);
  };

  const generateContextualResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    const { nearbyFriends, socialEnergy, recommendations } = socialContext;
    
    // Intent recognition and contextual responses
    if (lowerInput.includes('who') && lowerInput.includes('around')) {
      const activeFriends = nearbyFriends.filter(f => f.isActive);
      if (activeFriends.length > 0) {
        return `I see ${activeFriends.map(f => `${f.name} at ${f.location}`).join(', ')}. ${activeFriends[0].name} seems closest. Want to connect?`;
      }
      return "It's quiet right now, but the energy is building. Perfect time to spark something new.";
    }
    
    if (lowerInput.includes('vibe') || lowerInput.includes('energy')) {
      if (socialEnergy > 80) {
        return `The energy is electric tonight! ${socialEnergy}% social flow. ${recommendations[0] || 'Time to ride the wave'}.`;
      } else if (socialEnergy < 40) {
        return `Energy is mellow right now. ${getTimeMessage()}. Maybe time to ${recommendations[0]?.toLowerCase() || 'set the vibe'}.`;
      }
      return `Feeling a ${socialEnergy}% energy flow. The field is alive and ready for connection.`;
    }
    
    if (lowerInput.includes('join') || lowerInput.includes('go')) {
      const nearestFriend = nearbyFriends.find(f => f.isActive && f.distance < 1);
      if (nearestFriend) {
        return `Yes! ${nearestFriend.name} is at ${nearestFriend.location}. I'll pulse them you're coming. Follow your intuition.`;
      }
      return "The pulse is calling you forward. Trust the flow and see where it leads.";
    }
    
    if (lowerInput.includes('create') || lowerInput.includes('start')) {
      return `Perfect timing for creation. Your vibe is magnetic right now. Want to start a floq and see who gravitates toward your energy?`;
    }
    
    // Default contextual responses based on time
    switch (timeState) {
      case 'dawn':
      case 'morning':
        return "Morning energy is pure potential. What intention wants to flow through you today?";
      case 'evening':
      case 'night':
        return "The social field is alive tonight. I can feel the connections wanting to happen. What's calling to you?";
      case 'late':
        return "Late night wisdom emerges. The most authentic connections happen in these quiet hours.";
      default:
        return "I'm here, feeling the pulse of your social field. What's moving through you right now?";
    }
  };

  const speakMessage = (message: string) => {
    if (synthesis.current) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      synthesis.current.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      synthesis.current?.cancel();
      setIsSpeaking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl p-8 border border-border/40 glow-primary max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center animate-pulse-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">FLOQ AI</h3>
              <p className="text-xs text-muted-foreground">Social Reality Copilot</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:glow-secondary">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Current Message */}
        {currentMessage && (
          <div className="mb-6 p-4 bg-primary/10 rounded-2xl border border-primary/20">
            <p className="text-sm text-foreground">{currentMessage}</p>
          </div>
        )}

        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="mb-6 max-h-40 overflow-y-auto space-y-2">
            {conversation.slice(-4).map((msg, idx) => (
              <div key={idx} className={`text-xs p-2 rounded-xl ${
                msg.role === 'user' 
                  ? 'bg-accent/20 text-accent-foreground ml-4' 
                  : 'bg-muted/20 text-muted-foreground mr-4'
              }`}>
                {msg.message}
              </div>
            ))}
          </div>
        )}

        {/* Voice Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isListening ? "default" : "secondary"}
            size="lg"
            onClick={toggleListening}
            className={`rounded-full ${isListening ? 'gradient-primary animate-pulse' : ''} transition-smooth hover:glow-active`}
          >
            {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={toggleSpeaking}
            className="rounded-full transition-smooth hover:glow-secondary"
          >
            {isSpeaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="mt-6 text-center space-y-2">
          {isListening && (
            <p className="text-xs text-primary animate-pulse">Listening...</p>
          )}
          {isSpeaking && (
            <p className="text-xs text-accent animate-pulse">Speaking...</p>
          )}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Social Energy: {socialContext.socialEnergy}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};