import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react';

type CommitmentMeterProps = {
  omega_G: number;
  P_G: number;
  gatePass: boolean;
  explanation?: string;
  participantStats?: {
    accepted: number;
    maybe: number;
    pending: number;
    total: number;
  };
  className?: string;
};

export function CommitmentMeter({ 
  omega_G, 
  P_G, 
  gatePass, 
  explanation,
  participantStats,
  className 
}: CommitmentMeterProps) {
  const commitment = participantStats ? 
    ((participantStats.accepted + participantStats.maybe * 0.5) / participantStats.total) * 100 : 0;

  const getStatus = () => {
    if (gatePass && commitment > 75) {
      return { 
        icon: CheckCircle, 
        label: 'Ready to Lock', 
        variant: 'default' as const,
        color: 'text-green-600'
      };
    }
    if (gatePass && commitment > 50) {
      return { 
        icon: Clock, 
        label: 'Good Progress', 
        variant: 'secondary' as const,
        color: 'text-yellow-600'
      };
    }
    return { 
      icon: AlertTriangle, 
      label: 'Need More RSVPs', 
      variant: 'destructive' as const,
      color: 'text-red-600'
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Commitment Meter
          </CardTitle>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Group Commitment</span>
            <span className="font-medium">{Math.round(commitment)}%</span>
          </div>
          <Progress value={commitment} className="h-2" />
        </div>

        {/* Stats breakdown */}
        {participantStats && (
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="space-y-1">
              <div className="font-medium text-green-600">{participantStats.accepted}</div>
              <div className="text-muted-foreground">Yes</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-yellow-600">{participantStats.maybe}</div>
              <div className="text-muted-foreground">Maybe</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-gray-500">{participantStats.pending}</div>
              <div className="text-muted-foreground">Pending</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">{participantStats.total}</div>
              <div className="text-muted-foreground">Total</div>
            </div>
          </div>
        )}

        {/* Predictability metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-sm font-medium">Spread (ω_G)</div>
            <div className="text-xs text-muted-foreground">{(omega_G * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">Info (P_G)</div>
            <div className="text-xs text-muted-foreground">{(P_G * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Explanation */}
        {explanation && (
          <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
            {explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}