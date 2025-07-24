import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function CardSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 animate-pulse">
      <CardHeader className="text-center pb-4">
        <div className="h-6 bg-muted rounded-md mb-2" />
        <div className="h-4 bg-muted rounded-md w-24 mx-auto" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-background/50">
            <div className="h-4 bg-muted rounded-md mb-2" />
            <div className="h-6 bg-muted rounded-md" />
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <div className="h-4 bg-muted rounded-md mb-2" />
            <div className="h-6 bg-muted rounded-md" />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-md w-20" />
          <div className="h-20 bg-muted rounded-md" />
        </div>

        {/* Additional content */}
        <div className="space-y-3">
          <div className="h-16 bg-muted rounded-lg" />
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}