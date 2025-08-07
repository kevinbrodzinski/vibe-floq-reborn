import { motion } from "framer-motion";

export const FullScreenSpinner = () => {
  // Debug logging
  console.log('🔄 FullScreenSpinner is showing - component is stuck loading');
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-background flex items-center justify-center"
      style={{ zIndex: 999999 }}
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {import.meta.env.DEV && (
          <div className="text-white text-center">
            <p className="font-bold">🔄 Loading Component...</p>
            <p className="text-sm opacity-75">Check console for import errors</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};