import React from 'react'
import { Sun, Cloud, CloudRain, Umbrella, Wind, Thermometer, Droplets } from 'lucide-react'

interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'windy'
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
  feelsLike: number
}

interface WeatherOverlayProps {
  weather: WeatherData
  className?: string
}

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  weather,
  className = ''
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
      case 'windy':
        return <Wind className="w-5 h-5 text-gray-300" />
      default:
        return <Sun className="w-5 h-5 text-yellow-400" />
    }
  }

  const getWeatherColor = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return 'bg-yellow-500/20 border-yellow-500/30'
      case 'cloudy':
        return 'bg-gray-500/20 border-gray-500/30'
      case 'rainy':
        return 'bg-blue-500/20 border-blue-500/30'
      case 'stormy':
        return 'bg-purple-500/20 border-purple-500/30'
      case 'windy':
        return 'bg-gray-400/20 border-gray-400/30'
      default:
        return 'bg-yellow-500/20 border-yellow-500/30'
    }
  }

  return (
    <div className={`absolute top-4 right-4 z-50 ${className}`}>
      <div className={`bg-card/90 backdrop-blur-xl rounded-2xl p-4 border ${getWeatherColor(weather.condition)} shadow-lg`}>
        {/* Main weather info */}
        <div className="flex items-center gap-3 mb-3">
          {getWeatherIcon(weather.condition)}
          <div>
            <div className="text-white font-bold text-lg">
              {weather.temperature}°F
            </div>
            <div className="text-white/70 text-sm capitalize">
              {weather.condition}
            </div>
          </div>
        </div>

        {/* Weather details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Thermometer className="w-4 h-4" />
            <span>Feels like {weather.feelsLike}°F</span>
          </div>
          
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Droplets className="w-4 h-4" />
            <span>{weather.humidity}% humidity</span>
          </div>
          
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Wind className="w-4 h-4" />
            <span>{weather.windSpeed} mph</span>
          </div>
          
          {weather.precipitation > 0 && (
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <CloudRain className="w-4 h-4" />
              <span>{weather.precipitation}% chance</span>
            </div>
          )}
        </div>

        {/* Weather-based activity suggestion */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-white/90 text-xs font-medium">
            {weather.condition === 'rainy' || weather.condition === 'stormy' 
              ? '🌧️ Perfect for indoor activities'
              : weather.condition === 'sunny'
              ? '☀️ Great weather for outdoor fun'
              : weather.condition === 'windy'
              ? '💨 Consider sheltered activities'
              : '☁️ Mixed conditions - check both options'
            }
          </div>
        </div>
      </div>
    </div>
  )
} 