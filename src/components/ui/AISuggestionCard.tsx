import React from 'react'
import { RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react'

interface WeeklyAISuggestion {
  text: string
  generated_at: string
  energy_score: number
  social_score: number
}

interface AISuggestionCardProps {
  suggestion: WeeklyAISuggestion
  onRefresh?: () => void
  loading?: boolean
  source?: 'cache' | 'openai'
}

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  suggestion,
  onRefresh,
  loading = false,
  source = 'cache'
}) => {
  const parseBulletPoints = (text: string) => {
    return text
      .split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map(line => line.replace('•', '').trim())
      .filter(Boolean)
  }

  const bulletPoints = parseBulletPoints(suggestion.text)

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white">AI Insight</h3>
          <p className="text-sm text-white/70">
            {source === 'cache' ? 'Cached suggestion' : 'Fresh from AI'}
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="ml-auto p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} text-white`} />
          </button>
        )}
      </div>
      {bulletPoints.length > 0 ? (
        <ul className="list-disc list-inside text-white/90 leading-relaxed space-y-1 mb-4">
          {bulletPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      ) : (
        <p className="text-white/90 leading-relaxed mb-4">{suggestion.text}</p>
      )}
      <div className="flex items-center gap-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${getScoreColor(suggestion.energy_score)}`} />
          <span className="text-sm text-white/70">Energy: {suggestion.energy_score}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${getScoreColor(suggestion.social_score)}`} />
          <span className="text-sm text-white/70">Social: {suggestion.social_score}%</span>
        </div>
      </div>
    </div>
  )
} 