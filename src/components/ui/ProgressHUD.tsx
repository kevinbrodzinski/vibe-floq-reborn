import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function ProgressHUD({ message }: { message?: string }) {
  if (typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 shadow-xl"
      >
        <Loader2 className="animate-spin" />
        {message && <span className="text-sm font-medium">{message}</span>}
      </motion.div>
    </div>,
    document.body
  );
}