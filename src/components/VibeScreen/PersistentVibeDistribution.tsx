import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { VIBES } from '@/lib/vibes';
import { VIBE_RGB } from '@/constants/vibes';

interface VibeDistributionData {
  name: string;
  value: number;
  color: string;
}

interface PersistentVibeDistributionProps {
  className?: string;
}

const PersistentVibeDistributionComponent: React.FC<PersistentVibeDistributionProps> = ({ 
  className = "" 
}) => {
  const [pieData, setPieData] = useState<VibeDistributionData[]>([]);

  // Memoize the color function to prevent re-creation on every render
  const getVibeColor = React.useCallback((vibe: string) => {
    if (VIBE_RGB[vibe as keyof typeof VIBE_RGB]) {
      const [r, g, b] = VIBE_RGB[vibe as keyof typeof VIBE_RGB];
      return `rgb(${r}, ${g}, ${b})`;
    }
    return '#4C92FF';
  }, []);

  // Memoize the data generation function
  const generatePieData = React.useCallback((): VibeDistributionData[] => {
    return VIBES.map(vibe => ({
      name: vibe.charAt(0).toUpperCase() + vibe.slice(1),
      value: Math.floor(5 + Math.random() * 25), // Smaller values since we have more vibes
      color: getVibeColor(vibe)
    }));
  }, [getVibeColor]);

  useEffect(() => {
    // Initial data - only run once on mount
    const initialData = generatePieData();
    console.log('🥧 PersistentVibeDistribution: Initial pie data loaded');
    setPieData(initialData);

    // Update every hour (3600000 ms) instead of every 30 seconds
    const interval = setInterval(() => {
      const newData = generatePieData();
      console.log('🥧 PersistentVibeDistribution: Hourly data update');
      setPieData(newData);
    }, 3600000); // 1 hour = 3600000 ms

    return () => clearInterval(interval);
  }, [generatePieData]); // Only depend on the memoized function

    return (
    <Card className={`p-4 bg-card/40 backdrop-blur-sm border-border/30 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Vibe Distribution</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">({pieData.length}/10 vibes)</span>
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <div className="h-48 w-full">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [`${value}%`, name]}
                labelFormatter={(label) => `${label} Vibe`}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <PieChartIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading vibe data...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend - Show all 10 vibes in a 2-column grid */}
      <div className="grid grid-cols-2 gap-1 mt-2 max-h-32 overflow-y-auto">
        {pieData.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-foreground">{item.name}</span>
            <span className="text-muted-foreground ml-auto">{item.value}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const PersistentVibeDistribution = React.memo(PersistentVibeDistributionComponent);