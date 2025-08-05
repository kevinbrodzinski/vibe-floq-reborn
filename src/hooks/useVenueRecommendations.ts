export interface VenueRecommendation {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  distance: string;
  travelTime: string;
  imageUrl: string;
  
  // Intelligence matching
  vibeMatch: {
    score: number;
    explanation: string;
    userVibes: string[];
    venueVibes: string[];
    synergy: string;
  };
  
  // Crowd predictions
  crowdIntelligence: {
    currentCapacity: number;
    predictedPeak: string;
    typicalCrowd: string;
    friendCompatibility: string;
    busyTimes: { [hour: string]: number };
  };
  
  // Social proof
  socialProof: {
    friendVisits: number;
    recentVisitors: string[];
    networkRating: number;
    popularWith: string;
    testimonials?: string[];
  };
  
  // Contextual factors
  context: {
    dayOfWeek: string;
    timeRelevance: string;
    weatherSuitability: string;
    eventContext: string;
    moodAlignment: string;
  };
  
  // Real-time factors
  realTime: {
    liveEvents: string[];
    waitTime: string;
    specialOffers: string[];
    atmosphereLevel: 'low' | 'moderate' | 'high' | 'peak';
    nextEventTime?: string;
  };
  
  // Confidence and reasoning
  confidence: number;
  topReasons: string[];
  warnings?: string[];
}

export const useVenueRecommendations = () => {
  const data: VenueRecommendation[] = [
    {
      id: 'cafe-gratitude',
      name: 'Café Gratitude',
      category: 'Café & Wellness',
      address: '639 N Larchmont Blvd',
      rating: 4.3,
      priceLevel: '$$',
      distance: '0.8 mi',
      travelTime: '12 min walk',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
      
      vibeMatch: {
        score: 0.92,
        explanation: "Perfect match for your 'flowing + social' vibe combination",
        userVibes: ['flowing', 'social'],
        venueVibes: ['mindful', 'creative', 'community'],
        synergy: "Your flowing energy pairs beautifully with their mindful atmosphere, while the communal tables support your social side"
      },
      
      crowdIntelligence: {
        currentCapacity: 65,
        predictedPeak: "7:30-8:30pm (post-work creative crowd)",
        typicalCrowd: "Creative professionals, wellness enthusiasts, digital nomads",
        friendCompatibility: "92% of your friend network enjoys venues like this",
        busyTimes: { '17': 45, '18': 75, '19': 85, '20': 70, '21': 40 }
      },
      
      socialProof: {
        friendVisits: 7,
        recentVisitors: ['Maya (2 days ago)', 'Alex (1 week ago)', 'Jordan (2 weeks ago)'],
        networkRating: 4.5,
        popularWith: "Your creative friend circle - especially those into wellness",
        testimonials: [
          "Perfect for deep conversations over amazing bowls - Maya",
          "Love the community vibe here - Alex"
        ]
      },
      
      context: {
        dayOfWeek: "Perfect Friday energy - creative but not too intense",
        timeRelevance: "Ideal timing for sunset dinner with good conversation",
        weatherSuitability: "Great for today's mild weather with outdoor seating",
        eventContext: "Post-work transition from day to evening socializing",
        moodAlignment: "Matches your need for meaningful connection + good food"
      },
      
      realTime: {
        liveEvents: ['Acoustic session starting at 7pm', 'Community gratitude circle at 8pm'],
        waitTime: 'No wait currently, 15min expected by 7:30pm',
        specialOffers: ['Happy hour bowls until 7pm', '20% off smoothies for groups'],
        atmosphereLevel: 'moderate',
        nextEventTime: '7:00 PM - Live acoustic music begins'
      },
      
      confidence: 0.92,
      topReasons: [
        "Vibe alignment is exceptional (92% match)",
        "7 friends have visited recently with positive feedback",
        "Perfect timing for your energy transition",
        "Live music creates ideal social atmosphere",
        "Healthy options align with your wellness preferences"
      ]
    },
    
    {
      id: 'the-roosevelt',
      name: 'The Roosevelt',
      category: 'Cocktail Lounge',
      address: '7000 Hollywood Blvd',
      rating: 4.1,
      priceLevel: '$$$',
      distance: '2.1 mi',
      travelTime: '25 min metro',
      imageUrl: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400',
      
      vibeMatch: {
        score: 0.85,
        explanation: "Your social energy + venue's sophisticated atmosphere = perfect evening evolution",
        userVibes: ['social', 'flowing'],
        venueVibes: ['sophisticated', 'energetic', 'historic'],
        synergy: "As your energy builds through the evening, this venue provides the perfect escalation from casual to elevated social"
      },
      
      crowdIntelligence: {
        currentCapacity: 40,
        predictedPeak: "9:00-11:00pm (prime cocktail hours)",
        typicalCrowd: "Young professionals, creatives, date night couples",
        friendCompatibility: "78% match - your friend group loves elevated cocktail experiences",
        busyTimes: { '18': 35, '19': 50, '20': 70, '21': 90, '22': 85, '23': 60 }
      },
      
      socialProof: {
        friendVisits: 12,
        recentVisitors: ['Kai (last Friday)', 'Sam (2 weeks ago)', 'Chris (1 month ago)'],
        networkRating: 4.2,
        popularWith: "Your social butterflies and cocktail enthusiasts",
        testimonials: [
          "Amazing cocktails and perfect for groups - Kai",
          "The rooftop view is incredible for photos - Sam"
        ]
      },
      
      context: {
        dayOfWeek: "Friday night energy - perfect for cocktails and socializing",
        timeRelevance: "Ideal for evening escalation after dinner elsewhere",
        weatherSuitability: "Rooftop perfect for tonight's clear skies",
        eventContext: "Great for continuing the night with style",
        moodAlignment: "Elevates your social energy to sophisticated evening vibes"
      },
      
      realTime: {
        liveEvents: ['DJ set starts at 9pm', 'Rooftop opens at sunset (6:45pm)'],
        waitTime: 'Walk-ins welcome until 8pm, reservations recommended after',
        specialOffers: ['Friday happy hour cocktails until 7pm'],
        atmosphereLevel: 'high',
        nextEventTime: '6:45 PM - Rooftop opens for sunset views'
      },
      
      confidence: 0.85,
      topReasons: [
        "Strong match for your evening social escalation",
        "12 friends have been here with great experiences", 
        "Perfect timing for rooftop sunset views",
        "DJ creates ideal Friday night atmosphere",
        "Sophisticated setting matches your elevated mood"
      ],
      warnings: [
        "Gets quite busy after 9pm - arrive earlier for best experience",
        "Higher price point - budget accordingly"
      ]
    },

    {
      id: 'grand-central-market',
      name: 'Grand Central Market',
      category: 'Food Hall & Market',
      address: '317 S Broadway',
      rating: 4.4,
      priceLevel: '$$',
      distance: '1.5 mi',
      travelTime: '18 min metro',
      imageUrl: 'https://images.unsplash.com/photo-1567521464027-f7c65d1454bb?w=400',
      
      vibeMatch: {
        score: 0.88,
        explanation: "Your flowing + social vibes thrive in this diverse, exploratory environment",
        userVibes: ['flowing', 'social', 'exploratory'],
        venueVibes: ['diverse', 'casual', 'community', 'authentic'],
        synergy: "Perfect for your flowing nature - move between vendors, try different foods, and meet interesting people naturally"
      },
      
      crowdIntelligence: {
        currentCapacity: 55,
        predictedPeak: "6:30-7:30pm (dinner rush with variety seekers)",
        typicalCrowd: "Food lovers, tourists, local families, young professionals",
        friendCompatibility: "85% of your network enjoys diverse food experiences",
        busyTimes: { '17': 50, '18': 80, '19': 85, '20': 60, '21': 30 }
      },
      
      socialProof: {
        friendVisits: 15,
        recentVisitors: ['Jo (yesterday)', 'Riley (3 days ago)', 'Morgan (1 week ago)'],
        networkRating: 4.6,
        popularWith: "Your foodie friends and adventure seekers",
        testimonials: [
          "So many options, never boring - Jo",
          "Great for groups with different tastes - Riley"
        ]
      },
      
      context: {
        dayOfWeek: "Friday exploration - perfect for food discovery",
        timeRelevance: "Great for early evening fuel before other plans",
        weatherSuitability: "Indoor market perfect regardless of weather",
        eventContext: "Ideal starting point for a night of exploration",
        moodAlignment: "Satisfies your curiosity and social hunger simultaneously"
      },
      
      realTime: {
        liveEvents: ['Live mariachi band until 7:30pm', 'Weekend vendor pop-ups'],
        waitTime: 'Most vendors have short lines, popular spots 5-10min wait',
        specialOffers: ['Weekend happy hour at several vendors', '$5 off $25+ at select stalls'],
        atmosphereLevel: 'moderate',
        nextEventTime: '7:30 PM - Mariachi performance finale'
      },
      
      confidence: 0.88,
      topReasons: [
        "Exceptional variety matches your exploratory spirit",
        "15 friends love this spot for group dining",
        "Live music adds perfect social energy",
        "Great value with many price points",
        "Central location makes it easy to continue plans elsewhere"
      ]
    }
  ];

  return { data };
};