import { useState, useCallback } from 'react'
import type { PlanStop, Plan } from '@/types/plan'

export interface PlanTemplate {
  id: string
  name: string
  description?: string
  stops: Omit<PlanStop, 'id' | 'created_by'>[]
  tags: string[]
  createdAt: Date
  createdBy: string
  usageCount: number
}

// Mock templates for now - in real app, these would come from Supabase
const MOCK_TEMPLATES: PlanTemplate[] = [
  {
    id: 'template-1',
    name: 'Classic Night Out',
    description: 'Dinner, drinks, and late night fun',
    stops: [
      {
        title: 'Dinner',
        venue: 'Restaurant',
        startTime: '18:00',
        endTime: '20:00',
        duration_minutes: 120,
        status: 'suggested',
        color: '#8B5CF6',
        participants: []
      },
      {
        title: 'Cocktails',
        venue: 'Bar',
        startTime: '20:30',
        endTime: '22:30',
        duration_minutes: 120,
        status: 'suggested',
        color: '#06D6A0',
        participants: []
      },
      {
        title: 'Dancing',
        venue: 'Club',
        startTime: '23:00',
        endTime: '02:00',
        duration_minutes: 180,
        status: 'suggested',
        color: '#EF476F',
        participants: []
      }
    ],
    tags: ['nightlife', 'dinner', 'drinks'],
    createdAt: new Date(),
    createdBy: 'user-1',
    usageCount: 12
  },
  {
    id: 'template-2',
    name: 'Weekend Brunch',
    description: 'Relaxed weekend morning',
    stops: [
      {
        title: 'Coffee',
        venue: 'Café',
        startTime: '10:00',
        endTime: '11:00',
        duration_minutes: 60,
        status: 'suggested',
        color: '#F77F00',
        participants: []
      },
      {
        title: 'Brunch',
        venue: 'Brunch Spot',
        startTime: '11:30',
        endTime: '13:30',
        duration_minutes: 120,
        status: 'suggested',
        color: '#FCBF49',
        participants: []
      }
    ],
    tags: ['brunch', 'weekend', 'casual'],
    createdAt: new Date(),
    createdBy: 'user-1',
    usageCount: 8
  }
]

export function usePlanTemplates() {
  const [templates] = useState<PlanTemplate[]>(MOCK_TEMPLATES)
  const [isLoading, setIsLoading] = useState(false)

  const saveAsTemplate = useCallback(async (plan: Plan, name: string, description?: string) => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const template: PlanTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      stops: plan.stops.map(({ id, created_by, ...stop }) => stop),
      tags: [], // Could extract from stop titles/venues
      createdAt: new Date(),
      createdBy: 'current-user',
      usageCount: 0
    }
    
    // In real app, save to Supabase
    console.log('Saving template:', template)
    
    setIsLoading(false)
    return template
  }, [])

  const loadTemplate = useCallback((template: PlanTemplate): Omit<PlanStop, 'id'>[] => {
    return template.stops.map(stop => ({
      ...stop,
      // Generate new IDs when loading
      created_by: 'current-user'
    }))
  }, [])

  const deleteTemplate = useCallback(async (templateId: string) => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // In real app, delete from Supabase
    console.log('Deleting template:', templateId)
    
    setIsLoading(false)
  }, [])

  return {
    templates,
    isLoading,
    saveAsTemplate,
    loadTemplate,
    deleteTemplate
  }
}