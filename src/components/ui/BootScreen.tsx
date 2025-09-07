import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface BootScreenProps {
  text: string;
  timeoutText: string;
}

export const BootScreen = ({ text, timeoutText }: BootScreenProps) => {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTimeout(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-background flex flex-col items-center justify-center"
    >
      <motion.div
        className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full mb-4"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-muted-foreground text-sm">{text}</p>
      {showTimeout && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground/60 mt-2"
        >
          {timeoutText}
        </motion.p>
      )}
    </motion.div>
  );
};