import * as React from 'react';
import { MapPin } from 'lucide-react';

type Props = {
  valueKm: number;
  onChangeKm: (km: number) => void;
  className?: string;
};

const DISTANCE_OPTIONS = [
  { value: 0.2, label: '200m' },
  { value: 0.5, label: '500m' },
  { value: 1, label: '1km' },
  { value: 2, label: '2km' },
  { value: 5, label: '5km' },
];

export function DistanceRadiusPicker({ valueKm, onChangeKm, className }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = DISTANCE_OPTIONS.find(opt => opt.value === valueKm)?.label || `${valueKm}km`;

  return (
    <div className={`relative ${className ?? ''}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 border border-white/15 text-white/80 hover:bg-white/15 hover:text-white transition-all duration-200"
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-900/95 backdrop-blur-xl rounded-lg border border-white/20 shadow-2xl z-50 min-w-[100px]">
          <div className="p-1">
            {DISTANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChangeKm(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  option.value === valueKm
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}