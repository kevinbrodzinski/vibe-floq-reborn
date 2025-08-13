import * as React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

export type FilterLogic = 'any' | 'all';

type Props = {
  value: FilterLogic;
  onChange: (v: FilterLogic) => void;
  className?: string;
  showInfo?: boolean;
};

export function FilterLogicToggle({ value, onChange, className, showInfo = true }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div
        className="inline-flex items-center rounded-full bg-white/10 border border-white/15 p-0.5"
        role="group"
        aria-label="Filter logic"
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange('any')}
          className={`h-8 px-3 rounded-full text-xs ${
            value === 'any' ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:bg-white/15'
          }`}
          aria-pressed={value === 'any'}
        >
          Match any
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange('all')}
          className={`h-8 px-3 rounded-full text-xs ${
            value === 'all' ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:bg-white/15'
          }`}
          aria-pressed={value === 'all'}
        >
          Match all
        </Button>
      </div>

      {showInfo && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Filter logic help"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/80 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-[260px] text-sm">
              <div className="font-medium mb-1">How matching works</div>
              <ul className="space-y-1 text-white/80">
                <li><span className="font-semibold">Match any</span>: shows places that match <em>at least one</em> selected filter.</li>
                <li><span className="font-semibold">Match all</span>: shows places that match <em>every</em> selected filter.</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}