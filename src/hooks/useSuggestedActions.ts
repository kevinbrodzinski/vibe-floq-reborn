export interface SuggestedAction {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  primary?: boolean;
  reasoning: {
    algorithm: string;
    crowdIntelligence: string;
    socialProof: string;
    contextualFactors: string[];
    confidence: number;
  };
  vibeBreakdown?: {
    composition: { [vibe: string]: number };
    trend: string;
    friendPresence: number;
  };
  realTimeFactors?: {
    liveEvents: string[];
    waitTimes: string;
    energyLevel: string;
  };
}

export const useSuggestedActions = () => {
  const actions: SuggestedAction[] = [
    {
      id: 'venues',
      title: '3 venues match your vibe',
      subtitle: '2 in West Hollywood · 1 in DTLA',
      cta: 'Explore Pulse',
      primary: true,
      reasoning: {
        algorithm: "Matches your 'flowing + social' vibe combination perfectly",
        crowdIntelligence: "These venues typically busy with creative professionals 6-8pm",
        socialProof: "4.2/5 stars from your friend network • 3 friends visited this week",
        contextualFactors: [
          "Live acoustic music at 2 locations starting in 30 mins",
          "Happy hour pricing until 7pm",
          "Low wait times reported",
          "Perfect for artistic conversations"
        ],
        confidence: 0.89
      },
      vibeBreakdown: {
        composition: { flowing: 45, social: 35, creative: 20 },
        trend: "Energy increasing since 6pm, peaks around 8pm",
        friendPresence: 2
      },
      realTimeFactors: {
        liveEvents: ["Acoustic set at Café Gratitude 7pm", "Art opening at Gallery Row 7:30pm"],
        waitTimes: "No wait at 2 venues, 15min at popular spot",
        energyLevel: "Building momentum - perfect timing"
      }
    },
    {
      id: 'floq',
      title: '"Friday Flow" Floq nearby',
      subtitle: '6 people · 0.3 mi away',
      cta: 'Request Invite',
      reasoning: {
        algorithm: "85% vibe compatibility with this group based on recent patterns",
        crowdIntelligence: "Group typically moves to 2-3 venues, stays out until 10pm",
        socialProof: "Plans with similar groups have 85% follow-through rate",
        contextualFactors: [
          "Group includes 2 people with shared interests",
          "Currently at coffee shop, planning dinner move",
          "Leader is someone you've successfully met before",
          "Group size perfect for intimate conversations"
        ],
        confidence: 0.73
      },
      vibeBreakdown: {
        composition: { flowing: 60, social: 30, energetic: 10 },
        trend: "Group energy increasing, optimal for joining now",
        friendPresence: 1
      },
      realTimeFactors: {
        liveEvents: ["Planning dinner at 7:30pm", "Considering bar hop after"],
        waitTimes: "Currently at table for 4 more people",
        energyLevel: "High engagement, welcoming new members"
      }
    },
  ];
  return { actions };
};