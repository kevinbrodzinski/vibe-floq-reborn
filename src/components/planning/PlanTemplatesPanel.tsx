import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Download, Trash2, Star, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { usePlanTemplates, type PlanTemplate } from '@/hooks/usePlanTemplates'
import type { Plan } from '@/types/plan'
import { cn } from '@/lib/utils'

interface PlanTemplatesPanelProps {
  currentPlan: Plan
  onLoadTemplate: (templateStops: any[]) => void
  className?: string
}

export function PlanTemplatesPanel({
  currentPlan,
  onLoadTemplate,
  className
}: PlanTemplatesPanelProps) {
  const { templates, isLoading, saveAsTemplate, loadTemplate, deleteTemplate } = usePlanTemplates()
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return

    await saveAsTemplate(currentPlan, templateName, templateDescription)
    setShowSaveDialog(false)
    setTemplateName('')
    setTemplateDescription('')
  }

  const handleLoadTemplate = (template: PlanTemplate) => {
    const templateStops = loadTemplate(template)
    onLoadTemplate(templateStops)
    setSelectedTemplate(null)
  }

  const totalDuration = (template: PlanTemplate) => {
    return template.stops.reduce((total, stop) => total + (stop.duration_minutes || 60), 0)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Plan Templates</h3>
        
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="w-4 h-4" />
              Save Current Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-3">
        <AnimatePresence>
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-3 border rounded-xl cursor-pointer transition-all",
                selectedTemplate === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-card/50"
              )}
              onClick={() => setSelectedTemplate(
                selectedTemplate === template.id ? null : template.id
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    {template.description && (
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3" />
                    {template.usageCount}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.round(totalDuration(template) / 60)}h
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {template.stops.length} stops
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {selectedTemplate === template.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-border/50"
                  >
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLoadTemplate(template)
                        }}
                        className="gap-1 flex-1"
                      >
                        <Download className="w-3 h-3" />
                        Load Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTemplate(template.id)
                        }}
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}