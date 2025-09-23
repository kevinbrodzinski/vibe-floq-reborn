import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface SectionItem {
  id: string;
  title: string;
  value: string | number;
  label?: string;
}

interface SectionRowProps {
  title: string;
  meta?: string;  // Added meta prop
  items: SectionItem[];
  onPressItem?: (id: string) => void;  // Changed to match usage
  emptyMessage?: string;
}

export const SectionRow = ({ 
  title, 
  meta,
  items, 
  onPressItem,
  emptyMessage = "Nothing here yet" 
}: SectionRowProps) => {
  if (!items || items.length === 0) {
    return (
      <motion.section
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-foreground px-4">{title}</h3>
        <div className="px-4">
          <div className="flex items-center justify-center h-24 bg-muted/50 rounded-lg border border-border">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="flex justify-between items-end px-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            className="mx-4 p-4 bg-card border border-border rounded-lg cursor-pointer hover:bg-card/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPressItem?.(item.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.title}</span>
                    {item.label && (
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{item.value}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};