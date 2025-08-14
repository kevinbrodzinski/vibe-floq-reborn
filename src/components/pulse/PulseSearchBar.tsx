import React from 'react';
import { Search } from 'lucide-react';
import { VoiceSearchButton } from '@/components/ui/VoiceSearchButton';

interface PulseSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PulseSearchBar: React.FC<PulseSearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search venues, vibes, or floqs...",
  disabled = false
}) => {
  return (
    <div className="px-6 mb-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full pl-12 pr-20 py-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:glow-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <VoiceSearchButton
            onVoiceInput={(text) => onChange(text)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};