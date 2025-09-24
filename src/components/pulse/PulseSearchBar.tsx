import React from 'react';
import { Search } from 'lucide-react';
import { VoiceSearchButton } from '@/components/ui/VoiceSearchButton';

interface PulseSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onVoiceInput?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const PulseSearchBar: React.FC<PulseSearchBarProps> = ({
  value,
  onChange,
  onVoiceInput,
  placeholder = "Search venues, vibes, or floqs...",
  disabled = false,
  className = ''
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleVoiceInput = (text: string) => {
    onChange(text);
    onVoiceInput?.(text);
  };

  return (
    <div className={`px-6 mb-4 ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
        
        {/* Input Field */}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={`
            w-full pl-12 pr-20 py-4 
            bg-white/10 backdrop-blur-xl rounded-3xl 
            border border-white/20 
            text-white placeholder-white/50 
            focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20
            hover:bg-white/15 hover:border-white/30
            transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
        
        {/* Voice Search Button */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <VoiceSearchButton
            onVoiceInput={handleVoiceInput}
            disabled={disabled}
          />
        </div>
        
        {/* Glow effect on focus */}
        <div className="absolute inset-0 rounded-3xl opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r from-indigo-500/20 via-pink-500/20 to-yellow-500/20 blur-xl -z-10" />
      </div>
    </div>
  );
};