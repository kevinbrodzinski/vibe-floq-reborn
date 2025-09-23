import React from 'react';

interface SectionItem {
  id: string;
  title: string;
  value: string | number;
  label?: string;
}

interface SectionRowProps {
  title: string;
  meta?: string;
  items: SectionItem[];
  onPressItem?: (id: string) => void;
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
      <section className="mt-3 px-4">
        <div className="flex justify-between items-end mb-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        </div>
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex justify-between items-end px-4 mb-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </div>
      
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-3 px-4 pb-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-none w-[150px] h-[110px] p-3 bg-card border border-border rounded-xl cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => onPressItem?.(item.id)}
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                    {item.title}
                  </div>
                </div>
                
                <div>
                  <div className="text-xl font-bold text-primary mb-1">
                    {item.value}
                  </div>
                  {item.label && (
                    <div className="text-xs text-muted-foreground">
                      {item.label}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};