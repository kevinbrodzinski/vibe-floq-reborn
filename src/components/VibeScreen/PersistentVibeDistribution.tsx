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

export const PersistentVibeDistribution: React.FC<PersistentVibeDistributionProps> = ({ 
  className = "" 
}) => {
  const [pieData, setPieData] = useState<VibeDistributionData[]>([]);

  const getVibeColor = (vibe: string) => {
    if (VIBE_RGB[vibe as keyof typeof VIBE_RGB]) {
      const [r, g, b] = VIBE_RGB[vibe as keyof typeof VIBE_RGB];
      return `rgb(${r}, ${g}, ${b})`;
    }
    return '#4C92FF';
  };

  const generatePieData = (): VibeDistributionData[] => {
    return VIBES.slice(0, 6).map(vibe => ({
      name: vibe.charAt(0).toUpperCase() + vibe.slice(1),
      value: Math.floor(10 + Math.random() * 40),
      color: getVibeColor(vibe)
    }));
  };

  useEffect(() => {
    // Initial data
    const initialData = generatePieData();
    console.log('🥧 PersistentVibeDistribution: Initial pie data:', initialData);
    setPieData(initialData);

    // Update every 30 seconds for demo purposes
    const interval = setInterval(() => {
      const newData = generatePieData();
      console.log('🥧 PersistentVibeDistribution: Updated pie data:', newData);
      setPieData(newData);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  console.log('🥧 PersistentVibeDistribution: Rendering with pieData:', pieData);

  return (
    <Card className={`p-4 bg-card/40 backdrop-blur-sm border-border/30 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Vibe Distribution</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">({pieData.length} vibes)</span>
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
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 mt-2">
        {pieData.slice(0, 4).map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-foreground">{item.name}</span>
            <span className="text-muted-foreground ml-auto">{item.value}%</span>
          </div>
        ))}
      </div>
      
      {/* Show remaining items if more than 4 */}
      {pieData.length > 4 && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          {pieData.slice(4).map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-foreground">{item.name}</span>
              <span className="text-muted-foreground ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};