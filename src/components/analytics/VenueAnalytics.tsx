import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, Users, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface VenueInsight {
  id: string;
  name: string;
  category: string;
  visitCount: number;
  totalHours: number;
  avgRating: number;
  peakHour: string;
  friendsMet: number;
  trend: 'up' | 'down' | 'stable';
}

interface VenueAnalyticsProps {
  timeRange: '7d' | '30d' | '90d';
}

export const VenueAnalytics: React.FC<VenueAnalyticsProps> = ({ timeRange }) => {
  // Mock data - would be fetched from analytics hooks
  const venueInsights: VenueInsight[] = [
    {
      id: '1',
      name: 'Blue Bottle Coffee',
      category: 'Coffee Shop',
      visitCount: 12,
      totalHours: 24.5,
      avgRating: 4.8,
      peakHour: '9:00 AM',
      friendsMet: 3,
      trend: 'up'
    },
    {
      id: '2', 
      name: 'The Local Pub',
      category: 'Bar',
      visitCount: 8,
      totalHours: 18.2,
      avgRating: 4.6,
      peakHour: '7:00 PM',
      friendsMet: 5,
      trend: 'stable'
    },
    {
      id: '3',
      name: 'Central Park',
      category: 'Park',
      visitCount: 15,
      totalHours: 45.3,
      avgRating: 4.9,
      peakHour: '2:00 PM',
      friendsMet: 8,
      trend: 'up'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Venues Visited</p>
                  <p className="text-2xl font-bold">{venueInsights.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-2xl font-bold">{venueInsights.reduce((sum, v) => sum + v.totalHours, 0).toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Friends Met</p>
                  <p className="text-2xl font-bold">{venueInsights.reduce((sum, v) => sum + v.friendsMet, 0)}</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Venue Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Top Venues ({timeRange})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {venueInsights.map((venue, index) => (
            <motion.div
              key={venue.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{venue.name}</h4>
                    <Badge variant="outline" className="text-xs">{venue.category}</Badge>
                    <span className="text-sm">{getTrendIcon(venue.trend)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Visits</p>
                      <p className="font-medium">{venue.visitCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Time</p>
                      <p className="font-medium">{venue.totalHours}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Peak Hour</p>
                      <p className="font-medium">{venue.peakHour}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Friends Met</p>
                      <p className="font-medium">{venue.friendsMet}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{venue.avgRating}</span>
                    <Progress value={venue.avgRating * 20} className="flex-1 max-w-32" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};