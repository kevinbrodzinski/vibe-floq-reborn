import type { AfterglowMoment } from '@/types/afterglow'

// Sample data for testing the enhanced moment components
export const sampleMomentsWithMetadata: AfterglowMoment[] = [
  {
    id: 'moment-1',
    timestamp: '2025-01-18T08:30:00Z',
    moment_type: 'venue_checkin',
    title: 'Morning Coffee at Blue Bottle',
    description: 'Started the day with a perfect cortado and some reading',
    color: '#8B5CF6',
    metadata: {
      location: {
        coordinates: [-122.4194, 37.7749],
        venue_name: 'Blue Bottle Coffee',
        venue_id: 'venue_123',
        address: '66 Mint St, San Francisco, CA',
        distance_from_previous: 0
      },
      people: {
        encountered_users: [
          {
            profile_id: 'user_456',
            interaction_strength: 0.3,
            shared_duration: 15,
            interaction_type: 'brief'
          }
        ],
        total_people_count: 8
      },
      social_context: {
        group_size: 1,
        activity_type: 'personal_time'
      },
      vibe: 'chill',
      intensity: 0.6
    }
  },
  {
    id: 'moment-2',
    timestamp: '2025-01-18T10:15:00Z',
    moment_type: 'floq_join',
    title: 'Joined Morning Hike Group',
    description: 'Met up with the hiking crew for our weekend adventure',
    color: '#10B981',
    metadata: {
      location: {
        coordinates: [-122.4545, 37.7562],
        venue_name: 'Golden Gate Park Trailhead',
        address: 'Golden Gate Park, San Francisco, CA',
        distance_from_previous: 2300
      },
      people: {
        encountered_users: [
          {
            profile_id: 'user_789',
            interaction_strength: 0.8,
            shared_duration: 120,
            interaction_type: 'hangout'
          },
          {
            profile_id: 'user_101',
            interaction_strength: 0.6,
            shared_duration: 90,
            interaction_type: 'activity'
          },
          {
            profile_id: 'user_202',
            interaction_strength: 0.7,
            shared_duration: 105,
            interaction_type: 'chat'
          }
        ],
        total_people_count: 6
      },
      social_context: {
        floq_id: 'floq_hiking_123',
        group_size: 6,
        activity_type: 'outdoor_activity'
      },
      vibe: 'energetic',
      intensity: 0.9
    }
  },
  {
    id: 'moment-3',
    timestamp: '2025-01-18T14:30:00Z',
    moment_type: 'venue_checkin',
    title: 'Lunch at Local Bistro',
    description: 'Grabbed a quick bite after the hike with some friends',
    color: '#F59E0B',
    metadata: {
      location: {
        coordinates: [-122.4212, 37.7849],
        venue_name: 'Tartine Bakery',
        venue_id: 'venue_456',
        address: '600 Guerrero St, San Francisco, CA',
        distance_from_previous: 1200
      },
      people: {
        encountered_users: [
          {
            profile_id: 'user_789',
            interaction_strength: 0.9,
            shared_duration: 45,
            interaction_type: 'hangout'
          },
          {
            profile_id: 'user_303',
            interaction_strength: 0.4,
            shared_duration: 20,
            interaction_type: 'chat'
          }
        ],
        total_people_count: 12
      },
      social_context: {
        group_size: 3,
        activity_type: 'dining'
      },
      vibe: 'cozy',
      intensity: 0.7
    }
  },
  {
    id: 'moment-4',
    timestamp: '2025-01-18T18:00:00Z',
    moment_type: 'personal',
    title: 'Evening Walk Home',
    description: 'Peaceful solo walk through the neighborhood',
    color: '#6366F1',
    metadata: {
      location: {
        coordinates: [-122.4167, 37.7849],
        venue_name: 'Dolores Park',
        address: 'Dolores Park, San Francisco, CA',
        distance_from_previous: 800
      },
      people: {
        encountered_users: [],
        total_people_count: 3
      },
      social_context: {
        group_size: 1,
        activity_type: 'personal_reflection'
      },
      vibe: 'contemplative',
      intensity: 0.4
    }
  }
]