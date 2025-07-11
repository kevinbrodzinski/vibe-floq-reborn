import { useState, useEffect } from 'react';

interface FlowState {
  text: string;
  emoji: string;
}

export const useCurrentFlow = (): FlowState => {
  const [flowState, setFlowState] = useState<FlowState>({
    text: 'Social Flow',
    emoji: '✨'
  });

  useEffect(() => {
    const hour = new Date().getHours();
    
    // Dynamic flow states based on time
    if (hour >= 5 && hour < 8) {
      setFlowState({ text: 'Dawn Ritual', emoji: '🌅' });
    } else if (hour >= 8 && hour < 12) {
      setFlowState({ text: 'Morning Energy', emoji: '⚡' });
    } else if (hour >= 12 && hour < 17) {
      setFlowState({ text: 'Steady Focus', emoji: '🎯' });
    } else if (hour >= 17 && hour < 21) {
      setFlowState({ text: 'Social Flow', emoji: '✨' });
    } else if (hour >= 21 && hour < 24) {
      setFlowState({ text: 'Night Pulse', emoji: '🌙' });
    } else {
      setFlowState({ text: 'Late Night Vibe', emoji: '🔮' });
    }
  }, []);

  return flowState;
};