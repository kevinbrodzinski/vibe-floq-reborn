import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface PlansSkeletonProps {
  count?: number;
}

export const PlansSkeleton: React.FC<PlansSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-lg bg-gray-800" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48 bg-gray-800" />
                <Skeleton className="h-5 w-16 bg-gray-800" />
              </div>
              <Skeleton className="h-4 w-full bg-gray-800" />
              <Skeleton className="h-4 w-3/4 bg-gray-800" />
              <div className="flex items-center gap-2 mt-4">
                <Skeleton className="h-4 w-4 bg-gray-800" />
                <Skeleton className="h-4 w-24 bg-gray-800" />
                <Skeleton className="h-4 w-4 bg-gray-800 ml-4" />
                <Skeleton className="h-4 w-20 bg-gray-800" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};