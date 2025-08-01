export interface FriendMatch {
  id: string;
  name: string;
  avatar: string;
  match: number;  // 0-1
  location: string;
  currentVibe: string;
  reasoning: {
    vibeAlignment: string;
    recentActivity: string;
    mutualInterests: string[];
    timingContext: string;
    interactionHistory: string;
    confidence: number;
  };
  socialProof: {
    mutualFriends: number;
    successRate: number;
    lastMeetup?: string;
  };
  contextualFactors: {
    travelTime: string;
    optimalWindow: string;
    energyTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

export const useFriendVibeMatches = () => {
  const data: FriendMatch[] = [
    {
      id: 'kai',
      name: 'Kai',
      avatar: 'https://i.pravatar.cc/72?u=kai',
      match: 0.92,
      location: 'Silver Lake',
      currentVibe: 'flowing',
      reasoning: {
        vibeAlignment: "Both feeling 'flowing' right now - perfect sync for creative exploration",
        recentActivity: "Visited 3 coffee shops and 2 art galleries this week",
        mutualInterests: ["The Roosevelt", "Arts District", "Coffee culture"],
        timingContext: "Usually most active 6-9pm on weekdays",
        interactionHistory: "You've planned together 4 times with 100% follow-through",
        confidence: 0.95
      },
      socialProof: {
        mutualFriends: 8,
        successRate: 100,
        lastMeetup: "2 weeks ago at Intelligentsia"
      },
      contextualFactors: {
        travelTime: "12 min walk",
        optimalWindow: "Next 45 mins (peak energy overlap)",
        energyTrend: 'increasing'
      }
    },
    {
      id: 'jo',
      name: 'Jo',
      avatar: 'https://i.pravatar.cc/72?u=jo',
      match: 0.78,
      location: 'Downtown LA',
      currentVibe: 'social',
      reasoning: {
        vibeAlignment: "Your 'flowing' + Jo's 'social' = great creative collaboration",
        recentActivity: "Been to 5 different venues this week, loves variety",
        mutualInterests: ["Grand Central Market", "Rooftop bars", "Live music"],
        timingContext: "Peak social hours - typically stays out until 10pm Fridays",
        interactionHistory: "3 successful meetups, always suggests great places",
        confidence: 0.82
      },
      socialProof: {
        mutualFriends: 12,
        successRate: 85,
        lastMeetup: "1 month ago at Perch"
      },
      contextualFactors: {
        travelTime: "25 min metro ride",
        optimalWindow: "Within 2 hours (before evening rush)",
        energyTrend: 'stable'
      }
    },
  ];
  return { data };
};