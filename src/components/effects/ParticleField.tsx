import React, { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  velocity: { x: number; y: number }
  color: string
  life: number
  maxLife: number
}

interface ParticleFieldProps {
  isActive: boolean
  intensity?: number
  color?: string
  direction?: 'up' | 'down' | 'left' | 'right' | 'radial'
  className?: string
}

export function ParticleField({ 
  isActive, 
  intensity = 0.5, 
  color = 'hsl(var(--primary))',
  direction = 'up',
  className = '' 
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const lastTimeRef = useRef(0)

  const particleCount = useMemo(() => {
    return Math.floor(intensity * 50) + 10 // 10-60 particles based on intensity
  }, [intensity])

  const createParticle = (canvas: HTMLCanvasElement, id: number): Particle => {
    const baseVelocity = intensity * 2
    
    let x, y, vx, vy
    
    switch (direction) {
      case 'up':
        x = Math.random() * canvas.width
        y = canvas.height + 20
        vx = (Math.random() - 0.5) * baseVelocity
        vy = -Math.random() * baseVelocity - 0.5
        break
      case 'down':
        x = Math.random() * canvas.width
        y = -20
        vx = (Math.random() - 0.5) * baseVelocity
        vy = Math.random() * baseVelocity + 0.5
        break
      case 'left':
        x = canvas.width + 20
        y = Math.random() * canvas.height
        vx = -Math.random() * baseVelocity - 0.5
        vy = (Math.random() - 0.5) * baseVelocity
        break
      case 'right':
        x = -20
        y = Math.random() * canvas.height
        vx = Math.random() * baseVelocity + 0.5
        vy = (Math.random() - 0.5) * baseVelocity
        break
      case 'radial':
      default:
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * 100 + 50
        x = centerX + Math.cos(angle) * distance
        y = centerY + Math.sin(angle) * distance
        vx = Math.cos(angle) * baseVelocity
        vy = Math.sin(angle) * baseVelocity
        break
    }

    const maxLife = 60 + Math.random() * 120 // 1-3 seconds at 60fps
    
    return {
      id,
      x,
      y,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      velocity: { x: vx, y: vy },
      color,
      life: maxLife,
      maxLife
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    resizeCanvas()

    // Initialize particles
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => 
      createParticle(canvas, i)
    )

    const animate = (currentTime: number) => {
      if (!isActive) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const deltaTime = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current = particlesRef.current
        .map(particle => {
          // Update position
          particle.x += particle.velocity.x
          particle.y += particle.velocity.y
          
          // Update life
          particle.life -= 1
          
          // Calculate fade based on life
          const lifeRatio = particle.life / particle.maxLife
          const currentOpacity = particle.opacity * Math.max(0, lifeRatio)
          
          // Draw particle
          if (currentOpacity > 0.01) {
            ctx.globalAlpha = currentOpacity
            ctx.fillStyle = particle.color
            ctx.beginPath()
            ctx.arc(
              particle.x / window.devicePixelRatio, 
              particle.y / window.devicePixelRatio, 
              particle.size, 
              0, 
              Math.PI * 2
            )
            ctx.fill()
          }
          
          return particle
        })
        .filter(particle => {
          // Remove dead particles and particles outside bounds
          const isAlive = particle.life > 0
          const inBounds = 
            particle.x > -50 && 
            particle.x < canvas.width + 50 && 
            particle.y > -50 && 
            particle.y < canvas.height + 50
          
          return isAlive && inBounds
        })

      // Add new particles to maintain count
      while (particlesRef.current.length < particleCount && isActive) {
        const id = Math.max(...particlesRef.current.map(p => p.id), -1) + 1
        particlesRef.current.push(createParticle(canvas, id))
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      observer.disconnect()
    }
  }, [isActive, intensity, color, direction, particleCount])

  return (
    <motion.canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.5 }}
      style={{ mixBlendMode: 'screen' }}
    />
  )
}