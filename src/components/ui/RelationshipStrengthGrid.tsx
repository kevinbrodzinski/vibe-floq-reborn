import React, { useState, useMemo } from 'react'
import { Filter, SortAsc, SortDesc, Users, Heart, Star } from 'lucide-react'
import { RelationshipStrengthIndicator } from './RelationshipStrengthIndicator'
import { useRelationshipStrength } from '@/hooks/useRelationshipStrength'

type SortOption = 'strength' | 'recent' | 'name'
type FilterOption = 'all' | 'public' | 'private' | 'close' | 'new'

export const RelationshipStrengthGrid: React.FC = () => {
  const { relationships, loading, updatePrivacy } = useRelationshipStrength()
  const [sortBy, setSortBy] = useState<SortOption>('strength')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showDetails, setShowDetails] = useState(false)

  const filteredAndSortedRelationships = useMemo(() => {
    let filtered = relationships

    // Apply filters
    switch (filterBy) {
      case 'public':
        filtered = filtered.filter(r => r.isPublic)
        break
      case 'private':
        filtered = filtered.filter(r => !r.isPublic)
        break
      case 'close':
        filtered = filtered.filter(r => r.strength >= 60)
        break
      case 'new':
        filtered = filtered.filter(r => r.strength < 30)
        break
      default:
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'strength':
          comparison = a.strength - b.strength
          break
        case 'recent':
          // In production, this would compare actual timestamps
          comparison = a.interactionCount - b.interactionCount
          break
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [relationships, sortBy, sortOrder, filterBy])

  const getFilterIcon = (filter: FilterOption) => {
    switch (filter) {
      case 'public':
        return <Users className="w-4 h-4" />
      case 'private':
        return <Heart className="w-4 h-4" />
      case 'close':
        return <Star className="w-4 h-4" />
      default:
        return <Filter className="w-4 h-4" />
    }
  }

  const getFilterLabel = (filter: FilterOption) => {
    switch (filter) {
      case 'public':
        return 'Public'
      case 'private':
        return 'Private'
      case 'close':
        return 'Close Friends'
      case 'new':
        return 'New Connections'
      default:
        return 'All'
    }
  }

  if (loading) {
    return (
      <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white/10 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Relationship Strength</h3>
          <p className="text-white/70 text-sm">
            {filteredAndSortedRelationships.length} of {relationships.length} connections
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Filter buttons */}
        <div className="flex gap-1">
          {(['all', 'public', 'private', 'close', 'new'] as FilterOption[]).map(filter => (
            <button
              key={filter}
              onClick={() => setFilterBy(filter)}
              className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                filterBy === filter
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {getFilterIcon(filter)}
              {getFilterLabel(filter)}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex gap-1 ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1 bg-white/10 text-white text-sm rounded-full border border-white/20 focus:outline-none focus:border-primary"
          >
            <option value="strength">Strength</option>
            <option value="recent">Recent</option>
            <option value="name">Name</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Relationship grid */}
      <div className="space-y-4">
        {filteredAndSortedRelationships.length > 0 ? (
          filteredAndSortedRelationships.map(relationship => (
            <RelationshipStrengthIndicator
              key={relationship.userId}
              relationship={relationship}
              onTogglePrivacy={updatePrivacy}
              showDetails={showDetails}
            />
          ))
        ) : (
          <div className="text-center py-8 text-white/50">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No relationships found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Stats summary */}
      {relationships.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">
                {relationships.filter(r => r.strength >= 80).length}
              </div>
              <div className="text-white/70 text-sm">Best Friends</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {relationships.filter(r => r.isPublic).length}
              </div>
              <div className="text-white/70 text-sm">Public</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {Math.round(relationships.reduce((sum, r) => sum + r.strength, 0) / relationships.length)}
              </div>
              <div className="text-white/70 text-sm">Avg Strength</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 