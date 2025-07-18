import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

interface AmbientBackgroundProps {
  vibe?: string
  energyLevel?: number
  socialIntensity?: number
  className?: string
}

export function AmbientBackground({ 
  vibe = 'chill', 
  energyLevel = 5, 
  socialIntensity = 5,
  className = '' 
}: AmbientBackgroundProps) {
  
  const backgroundConfig = useMemo(() => {
    const energy = energyLevel / 10
    const social = socialIntensity / 10
    
    const vibeConfigs = {
      chill: {
        primaryColor: 'hsl(200 70% 60%)',
        secondaryColor: 'hsl(220 60% 70%)',
        pattern: 'waves',
        speed: 0.3
      },
      energetic: {
        primaryColor: 'hsl(45 90% 60%)',
        secondaryColor: 'hsl(30 80% 70%)',
        pattern: 'pulse',
        speed: 1.2
      },
      romantic: {
        primaryColor: 'hsl(330 70% 60%)',
        secondaryColor: 'hsl(300 60% 70%)',
        pattern: 'heart',
        speed: 0.8
      },
      wild: {
        primaryColor: 'hsl(280 80% 60%)',
        secondaryColor: 'hsl(320 70% 70%)',
        pattern: 'chaos',
        speed: 1.5
      },
      cozy: {
        primaryColor: 'hsl(25 70% 60%)',
        secondaryColor: 'hsl(15 60% 70%)',
        pattern: 'soft',
        speed: 0.4
      },
      deep: {
        primaryColor: 'hsl(180 60% 40%)',
        secondaryColor: 'hsl(200 50% 50%)',
        pattern: 'flow',
        speed: 0.5
      }
    }
    
    const config = vibeConfigs[vibe as keyof typeof vibeConfigs] || vibeConfigs.chill
    
    return {
      ...config,
      opacity: 0.1 + (energy * 0.2), // More energy = more visible
      scale: 1 + (social * 0.3), // More social = larger patterns
      rotation: social * 360 // Social intensity affects rotation
    }
  }, [vibe, energyLevel, socialIntensity])

  const getPatternElement = () => {
    const { pattern, primaryColor, secondaryColor, speed, opacity, scale, rotation } = backgroundConfig
    
    const baseProps = {
      className: "absolute inset-0",
      style: { 
        opacity,
        filter: 'blur(40px)',
        mixBlendMode: 'soft-light' as const
      },
      animate: {
        scale: [scale * 0.8, scale * 1.2, scale * 0.8],
        rotate: [rotation, rotation + 180, rotation],
        opacity: [opacity * 0.5, opacity, opacity * 0.5]
      },
        transition: {
          duration: 20 / speed,
          repeat: Infinity,
          ease: [0.4, 0, 0.6, 1]
        }
    }

    switch (pattern) {
      case 'waves':
        return (
          <motion.div {...baseProps}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <radialGradient id="waveGradient">
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="100%" stopColor={secondaryColor} />
                </radialGradient>
              </defs>
              <circle cx="20" cy="30" r="15" fill="url(#waveGradient)" />
              <circle cx="70" cy="60" r="20" fill="url(#waveGradient)" />
              <circle cx="40" cy="80" r="12" fill="url(#waveGradient)" />
            </svg>
          </motion.div>
        )
        
      case 'pulse':
        return (
          <motion.div {...baseProps}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <radialGradient id="pulseGradient">
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="50%" stopColor={secondaryColor} />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="30" fill="url(#pulseGradient)" />
            </svg>
          </motion.div>
        )
        
      case 'heart':
        return (
          <motion.div {...baseProps}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="heartGradient">
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="100%" stopColor={secondaryColor} />
                </linearGradient>
              </defs>
              <path 
                d="M50,25 C35,5 5,15 50,65 C95,15 65,5 50,25 Z" 
                fill="url(#heartGradient)" 
                opacity="0.6"
              />
            </svg>
          </motion.div>
        )
        
      case 'chaos':
        return (
          <motion.div {...baseProps}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="chaosGradient">
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="50%" stopColor={secondaryColor} />
                  <stop offset="100%" stopColor={primaryColor} />
                </linearGradient>
              </defs>
              {Array.from({ length: 8 }, (_, i) => (
                <polygon
                  key={i}
                  points={`${20 + i * 10},${15 + i * 8} ${25 + i * 8},${35 + i * 6} ${15 + i * 12},${30 + i * 7}`}
                  fill="url(#chaosGradient)"
                  opacity="0.4"
                />
              ))}
            </svg>
          </motion.div>
        )
        
      case 'soft':
        return (
          <motion.div {...baseProps}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <radialGradient id="softGradient">
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="70%" stopColor={secondaryColor} />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <ellipse cx="30" cy="40" rx="25" ry="15" fill="url(#softGradient)" />
              <ellipse cx="70" cy="70" rx="20" ry="25" fill="url(#softGradient)" />
              <ellipse cx="50" cy="20" rx="15" ry="20" fill="url(#softGradient)" />
            </svg>
          </motion.div>
        )
        
      case 'flow':
      default:
        return (
          <motion.div {...baseProps}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={primaryColor} />
                  <stop offset="50%" stopColor={secondaryColor} />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path 
                d="M10,50 Q30,20 50,50 T90,50" 
                stroke="url(#flowGradient)" 
                strokeWidth="8" 
                fill="none" 
                opacity="0.6"
              />
              <path 
                d="M10,30 Q30,60 50,30 T90,30" 
                stroke="url(#flowGradient)" 
                strokeWidth="6" 
                fill="none" 
                opacity="0.4"
              />
            </svg>
          </motion.div>
        )
    }
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {getPatternElement()}
      
      {/* Additional overlay for depth */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${backgroundConfig.primaryColor}05, transparent 70%)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}