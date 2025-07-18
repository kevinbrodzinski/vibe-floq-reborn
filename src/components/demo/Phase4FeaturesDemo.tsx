import { useState } from 'react'
import { AfterglowMomentCard } from '@/components/AfterglowMomentCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MapPin, Activity, Sparkles } from 'lucide-react'
import { sampleMomentsWithMetadata } from '@/utils/sampleAfterglowData'

export function Phase4FeaturesDemo() {
  const [currentTab, setCurrentTab] = useState('overview')

  const stats = {
    totalMoments: sampleMomentsWithMetadata.length,
    totalPeople: sampleMomentsWithMetadata.reduce((sum, moment) => 
      sum + (moment.metadata.people?.total_people_count || 0), 0),
    knownConnections: sampleMomentsWithMetadata.reduce((sum, moment) => 
      sum + (moment.metadata.people?.encountered_users?.length || 0), 0),
    uniqueLocations: new Set(sampleMomentsWithMetadata
      .map(moment => moment.metadata.location?.venue_name)
      .filter(Boolean)).size,
    totalDistance: sampleMomentsWithMetadata.reduce((sum, moment) => 
      sum + (moment.metadata.location?.distance_from_previous || 0), 0)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Phase 4: Enhanced Afterglow Features
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience the rich metadata, people encounters, and location features that make each moment interactive and meaningful.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">{stats.totalMoments}</div>
          <div className="text-sm text-muted-foreground">Moments</div>
        </Card>
        
        <Card className="p-4 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-2xl font-bold">{stats.totalPeople}</div>
          <div className="text-sm text-muted-foreground">People Met</div>
        </Card>
        
        <Card className="p-4 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-secondary" />
          <div className="text-2xl font-bold">{stats.knownConnections}</div>
          <div className="text-sm text-muted-foreground">Known Connections</div>
        </Card>
        
        <Card className="p-4 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold">{stats.uniqueLocations}</div>
          <div className="text-sm text-muted-foreground">Locations</div>
        </Card>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moments">Interactive Moments</TabsTrigger>
          <TabsTrigger value="people">People Features</TabsTrigger>
          <TabsTrigger value="locations">Location Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">✨ Phase 4 Complete Features</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Database Schema Updates</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✅ Enhanced metadata with location coordinates</li>
                  <li>✅ Venue details and distance calculations</li>
                  <li>✅ Encountered people data with interaction strength</li>
                  <li>✅ Social context and intensity tracking</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-accent">Interactive Features</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✅ Clickable people count with modal</li>
                  <li>✅ Rich location chips with map integration</li>
                  <li>✅ User profile linking and avatars</li>
                  <li>✅ Interaction strength visualization</li>
                </ul>
              </div>
            </div>
          </Card>

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border">
            <h4 className="font-semibold mb-2">Total Journey Distance</h4>
            <div className="text-3xl font-bold text-primary">
              {(stats.totalDistance / 1000).toFixed(1)} km
            </div>
            <p className="text-sm text-muted-foreground">Across {stats.uniqueLocations} unique locations</p>
          </div>
        </TabsContent>

        <TabsContent value="moments" className="space-y-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold mb-2">Interactive Moment Cards</h3>
            <p className="text-muted-foreground">
              Click on people counts and location chips to explore rich interactions
            </p>
          </div>
          
          {sampleMomentsWithMetadata.map((moment, index) => (
            <AfterglowMomentCard
              key={`demo-${moment.timestamp}-${index}`}
              moment={moment}
              index={index}
              isFirst={index === 0}
              onShare={() => {
                console.log('Share moment:', moment.title)
              }}
              onSave={() => {
                console.log('Save moment:', moment.title)
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="people" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">👥 People Encounter Features</h3>
            <div className="space-y-4">
              {sampleMomentsWithMetadata.map((moment, index) => {
                const peopleData = moment.metadata.people
                if (!peopleData) return null

                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{moment.title}</h4>
                      <Badge variant="outline">
                        {peopleData.total_people_count} people
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Encountered:</span>
                        <div className="font-medium">{peopleData.total_people_count}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Known Connections:</span>
                        <div className="font-medium">{peopleData.encountered_users?.length || 0}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Strongest Bond:</span>
                        <div className="font-medium">
                          {peopleData.encountered_users?.length > 0 
                            ? `${Math.max(...peopleData.encountered_users.map(u => u.interaction_strength * 100))}%`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>

                    {peopleData.encountered_users && peopleData.encountered_users.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Interaction Details:</span>
                        <div className="space-y-1">
                          {peopleData.encountered_users.map((user, userIndex) => (
                            <div key={userIndex} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                              <span>User {user.user_id.slice(-3)}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {user.interaction_type}
                                </Badge>
                                <span>{Math.round(user.interaction_strength * 100)}% strength</span>
                                <span>{user.shared_duration}m</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">📍 Location & Distance Features</h3>
            <div className="space-y-4">
              {sampleMomentsWithMetadata.map((moment, index) => {
                const locationData = moment.metadata.location
                if (!locationData) return null

                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{moment.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {formatTime(moment.timestamp)}
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground">Venue:</span>
                          <div className="font-medium">{locationData.venue_name}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Address:</span>
                          <div className="text-xs">{locationData.address}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {locationData.coordinates && (
                          <div>
                            <span className="text-muted-foreground">Coordinates:</span>
                            <div className="text-xs font-mono">
                              {locationData.coordinates[1].toFixed(4)}, {locationData.coordinates[0].toFixed(4)}
                            </div>
                          </div>
                        )}
                        {locationData.distance_from_previous !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Distance from previous:</span>
                            <div className="font-medium">
                              {locationData.distance_from_previous > 0 
                                ? `${(locationData.distance_from_previous / 1000).toFixed(1)} km`
                                : 'Starting point'
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        if (locationData.coordinates) {
                          const [lng, lat] = locationData.coordinates
                          window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')
                        }
                      }}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      View on Map
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
}