import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SectionItem {
  id: string;
  title: string;
  value?: string;
  count?: number;
  label: string;
}

interface SectionRowProps {
  title: string;
  items: SectionItem[];
  onItemPress: (item: SectionItem) => void;
}

export const SectionRow: React.FC<SectionRowProps> = ({
  title,
  items,
  onItemPress
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[color:var(--foreground)] px-2">
        {title}
      </h2>
      
      <div className="flex gap-3 overflow-x-auto pb-2 px-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex-shrink-0"
          >
            <Button
              variant="outline"
              onClick={() => onItemPress(item)}
              className="h-auto p-4 flex flex-col items-start space-y-2 min-w-[140px] bg-[color:var(--card)] border-[color:var(--border)] hover:bg-[color:var(--accent)]"
            >
              <div className="text-lg font-semibold text-[color:var(--foreground)]">
                {item.value || item.count}
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)] font-normal">
                {item.title}
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)] font-normal">
                {item.label}
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};