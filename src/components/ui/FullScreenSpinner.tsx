import { motion } from "framer-motion";

export const FullScreenSpinner = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <motion.div
        className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};