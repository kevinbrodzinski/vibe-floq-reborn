
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewPlanWizard } from '@/pages/NewPlanWizard'
import { FloqsList } from '@/components/floqs/FloqsList'
import { MyFloqs } from '@/components/floqs/MyFloqs'

export function FlocksHome() {
  const [showNewPlan, setShowNewPlan] = useState(false)

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
            onClick={() => setShowNewPlan(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Floq
          </Button>
        </div>

        {/* My Floqs Section */}
        <MyFloqs />

        {/* Discover Floqs Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Discover Floqs</h2>
          <FloqsList />
        </div>
      </div>

      {/* New Plan Wizard Modal */}
      {showNewPlan && <NewPlanWizard />}
    </div>
  )
}
