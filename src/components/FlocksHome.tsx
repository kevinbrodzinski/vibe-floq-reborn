
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewPlanWizard } from '@/pages/NewPlanWizard'
import { CreateFloqSheet } from '@/components/CreateFloqSheet'
import { useFloqUI } from '@/contexts/FloqUIContext'
import { useActiveFloqs } from '@/hooks/useActiveFloqs'
import { useMyFlocks } from '@/hooks/useMyFlocks'

export function FlocksHome() {
  const [showNewPlan, setShowNewPlan] = useState(false)
  const { setShowCreateSheet } = useFloqUI()
  const { data: activeFloqs = [], isLoading } = useActiveFloqs({ limit: 10 })
  const { data: myFloqs = [] } = useMyFlocks()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Floqs</h1>
            <p className="text-muted-foreground">
              Discover and join nearby gatherings
            </p>
          </div>
          <Button
            onClick={() => setShowCreateSheet(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Floq
          </Button>
        </div>

        {/* My Floqs Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Floqs</h2>
          {myFloqs.length === 0 ? (
            <p className="text-muted-foreground">You haven't joined any floqs yet.</p>
          ) : (
            <div className="grid gap-3">
              {myFloqs.slice(0, 3).map((floq) => (
                <div key={floq.id} className="p-3 border rounded-lg">
                  <h3 className="font-medium">{floq.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{floq.primary_vibe}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discover Floqs Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Discover Floqs</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : activeFloqs.length === 0 ? (
            <p className="text-muted-foreground">No active floqs right now.</p>
          ) : (
            <div className="grid gap-3">
              {activeFloqs.slice(0, 5).map((floq) => (
                <div key={floq.id} className="p-3 border rounded-lg">
                  <h3 className="font-medium">{floq.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{floq.vibe_tag}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Floq Sheet */}
      <CreateFloqSheet />
      
      {/* New Plan Wizard Modal */}
      {showNewPlan && <NewPlanWizard />}
    </div>
  )
}
