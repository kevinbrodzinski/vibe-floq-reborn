import React, { useState } from 'react'
import { Shield, ShieldCheck, AlertTriangle } from 'lucide-react'

interface SafeModeButtonProps {
  isActive: boolean
  onToggle: (active: boolean) => void
  className?: string
}

export const SafeModeButton: React.FC<SafeModeButtonProps> = ({
  isActive,
  onToggle,
  className = ''
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleToggle = () => {
    if (isActive) {
      onToggle(false)            // turn off immediately
    } else {
      setShowConfirmation(true)  // ask before turning on
    }
  }

  const confirmSafeMode = () => {
    onToggle(true)
    setShowConfirmation(false)
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* icon-only button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          inline-flex items-center justify-center transition-transform duration-300
          hover:scale-110 focus:outline-none
          ${isActive ? 'text-red-500' : 'text-white hover:text-white/80'}
        `}
        title={isActive ? 'Safe Mode Active – Location Hidden' : 'Activate Safe Mode'}
        aria-label={isActive ? 'Deactivate Safe Mode' : 'Activate Safe Mode'}
      >
        {isActive ? (
          <ShieldCheck className="w-6 h-6" />
        ) : (
          <Shield className="w-6 h-6" />
        )}
      </button>

      {/* confirmation pop-up */}
      {showConfirmation && (
        <div className="absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl z-50 min-w-64">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-white font-semibold">Activate Safe Mode?</h3>
          </div>

          <p className="text-white/70 text-sm mb-4">
            This will immediately hide your location from everyone. You can disable it anytime.
          </p>

          <div className="flex gap-2">
            <button
              onClick={confirmSafeMode}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-xl transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => setShowConfirmation(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 px-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}