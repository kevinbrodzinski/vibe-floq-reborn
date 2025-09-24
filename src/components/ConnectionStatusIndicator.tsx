import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  isUnstable?: boolean;
  latency?: number | null;
  className?: string;
}

export function ConnectionStatusIndicator({
  isConnected,
  isUnstable = false,
  latency,
  className = ''
}: ConnectionStatusIndicatorProps) {
  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    if (isUnstable) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isConnected) return WifiOff;
    if (isUnstable) return AlertTriangle;
    return Wifi;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (isUnstable) return 'Connection unstable';
    return 'Connected';
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.div
        animate={isUnstable ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1, repeat: isUnstable ? Infinity : 0 }}
      >
        <StatusIcon className={`h-4 w-4 ${getStatusColor()}`} />
      </motion.div>
      
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {latency && isConnected && (
          <span className="text-xs text-muted-foreground">
            {latency}ms
          </span>
        )}
      </div>
      
      {isUnstable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200"
        >
          Reconnecting...
        </motion.div>
      )}
    </div>
  );
}