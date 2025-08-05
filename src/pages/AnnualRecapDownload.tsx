import { useState } from 'react'
import { useAnnualRecap } from '@/hooks/useAnnualRecap'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Calendar, MapPin, Clock } from 'lucide-react'

export default function AnnualRecapDownload() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1)
  const recap = useAnnualRecap()

  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i)

  const handleDownload = async () => {
    try {
      const result = await recap.mutateAsync(selectedYear)
      if (result.url) {
        window.open(result.url, '_blank')
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Annual Recap</h1>
        <p className="text-muted-foreground">Download your year in review</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Generate Your Yearly Report</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Venues visited</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time spent out</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Activity patterns</span>
              </div>
            </div>

            <Button 
              onClick={handleDownload}
              disabled={recap.isPending}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {recap.isPending ? 'Generating PDF...' : `Download ${selectedYear} Recap`}
            </Button>

            {recap.isError && (
              <p className="text-sm text-destructive text-center">
                Failed to generate recap. Please try again.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <div className="space-y-2">
          <h3 className="font-medium">What's included?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Total venues visited throughout the year</li>
            <li>• Time spent at different locations</li>
            <li>• Activity patterns and trends</li>
            <li>• Personalized insights and highlights</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}