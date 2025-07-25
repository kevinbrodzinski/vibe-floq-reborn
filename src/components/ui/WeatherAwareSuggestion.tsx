import React from 'react'
import { Sun, Cloud, CloudRain, Umbrella, Coffee, Users } from 'lucide-react'

interface WeatherInfo {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy'
  temperature: number
  isIndoor: boolean
  humidity?: number
  windSpeed?: number
  precipitation?: number
}

interface UpcomingEvent {
  id: string
  title: string
  startTime: string
  location: string
  projectedWeather?: WeatherInfo
}

interface WeatherAwareSuggestionProps {
  weather: WeatherInfo
  onIndoorToggle: () => void
  upcomingEvents?: UpcomingEvent[]
}

export const WeatherAwareSuggestion: React.FC<WeatherAwareSuggestionProps> = ({
  weather,
  onIndoorToggle,
  upcomingEvents = []
}) => {
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-5 h-5 text-yellow-400" />
      case 'cloudy':
        return <Cloud className="w-5 h-5 text-gray-400" />
      case 'rainy':
        return <CloudRain className="w-5 h-5 text-blue-400" />
      case 'stormy':
        return <Umbrella className="w-5 h-5 text-purple-400" />
      default:
        return <Sun className="w-5 h-5 text-yellow-400" />
    }
  }

  const getSuggestion = () => {
    if (weather.condition === 'rainy' || weather.condition === 'stormy') {
      return {
        text: 'Perfect weather for cozy indoor spots!',
        icon: <Coffee className="w-4 h-4 text-orange-400" />,
        action: 'Show indoor venues'
      }
    } else if (weather.condition === 'sunny') {
      return {
        text: 'Great weather for outdoor activities!',
        icon: <Users className="w-4 h-4 text-green-400" />,
        action: 'Show outdoor venues'
      }
    } else {
      return {
        text: 'Mixed weather - check both indoor and outdoor options',
        icon: <Cloud className="w-4 h-4 text-gray-400" />,
        action: 'Show all venues'
      }
    }
  }

  const suggestion = getSuggestion()

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-3xl p-4 border border-white/20">
      <div className="flex items-center gap-3 mb-3">
        {getWeatherIcon(weather.condition)}
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm">
            {weather.temperature}°F • {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
          </h3>
          <p className="text-white/80 text-xs">{suggestion.text}</p>
        </div>
        {suggestion.icon}
      </div>
      
      <div className="space-y-3">
        <button
          onClick={onIndoorToggle}
          className="w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 px-4 rounded-2xl transition-colors"
        >
          {suggestion.action}
        </button>

        {/* Upcoming Events Weather */}
        {upcomingEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-white/90 font-medium text-sm mb-3">Upcoming Events Weather</h4>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
                  <div className="flex-shrink-0">
                    {event.projectedWeather ? (
                      getWeatherIcon(event.projectedWeather.condition)
                    ) : (
                      <Cloud className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/90 text-sm font-medium truncate">
                      {event.title}
                    </div>
                    <div className="text-white/50 text-xs">
                      {new Date(event.startTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} • {event.location}
                    </div>
                  </div>
                  {event.projectedWeather && (
                    <div className="text-right">
                      <div className="text-white/90 text-sm font-medium">
                        {event.projectedWeather.temperature}°F
                      </div>
                      <div className="text-white/50 text-xs">
                        {event.projectedWeather.condition}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 