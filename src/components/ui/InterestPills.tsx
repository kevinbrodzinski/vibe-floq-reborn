import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InterestPillsProps {
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  suggestions?: string[];
  maxInterests?: number;
  placeholder?: string;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  'music', 'art', 'hiking', 'coffee', 'photography', 'cooking',
  'travel', 'fitness', 'reading', 'gaming', 'dancing', 'yoga',
  'writing', 'painting', 'running', 'swimming', 'cycling', 'climbing',
  'meditation', 'gardening', 'baking', 'knitting', 'drawing', 'singing',
  'volunteering', 'languages', 'technology', 'science', 'history', 'philosophy'
];

export function InterestPills({
  interests,
  onInterestsChange,
  suggestions = DEFAULT_SUGGESTIONS,
  maxInterests = 8,
  placeholder = "Type an interest and press Enter...",
  className
}: InterestPillsProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and existing interests
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
        !interests.includes(suggestion)
      )
      .slice(0, 5); // Limit to 5 suggestions

    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [inputValue, interests, suggestions]);

  const addInterest = (interest: string) => {
    const trimmedInterest = interest.trim().toLowerCase();
    
    if (!trimmedInterest || interests.includes(trimmedInterest)) {
      return;
    }

    if (interests.length >= maxInterests) {
      return;
    }

    const newInterests = [...interests, trimmedInterest];
    onInterestsChange(newInterests);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeInterest = (interestToRemove: string) => {
    const newInterests = interests.filter(interest => interest !== interestToRemove);
    onInterestsChange(newInterests);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addInterest(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && interests.length > 0) {
      // Remove last interest on backspace when input is empty
      removeInterest(interests[interests.length - 1]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addInterest(suggestion);
  };

  const handleInputFocus = () => {
    if (inputValue.trim() && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Interest Pills */}
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        <AnimatePresence>
          {interests.map((interest, index) => (
            <motion.div
              key={interest}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2 }}
              className="group relative"
            >
              <Badge
                variant="secondary"
                className="pr-6 hover:bg-secondary/80 transition-colors cursor-default"
              >
                {interest}
                <button
                  onClick={() => removeInterest(interest)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input and Suggestions */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={interests.length >= maxInterests ? `Maximum ${maxInterests} interests reached` : placeholder}
          disabled={interests.length >= maxInterests}
          className={cn(
            "transition-all duration-200",
            interests.length >= maxInterests && "opacity-50 cursor-not-allowed"
          )}
        />
        
        {/* Character count / limit indicator */}
        {interests.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {interests.length}/{maxInterests}
          </div>
        )}

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help text */}
      <div className="text-xs text-muted-foreground">
        {interests.length < maxInterests ? (
          <>
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to add an interest, 
            or click suggestions above
          </>
        ) : (
          "Maximum interests reached. Remove some to add more."
        )}
      </div>
    </div>
  );
} 