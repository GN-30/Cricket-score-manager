import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseOver = (e) => {
      if (['A', 'BUTTON', 'INPUT'].includes(e.target.tagName) || e.target.closest('a') || e.target.closest('button')) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', updateMousePosition)
    window.addEventListener('mouseover', handleMouseOver)

    return () => {
      window.removeEventListener('mousemove', updateMousePosition)
      window.removeEventListener('mouseover', handleMouseOver)
    }
  }, [])

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999] mix-blend-difference"
      animate={{
        x: mousePosition.x - 16,
        y: mousePosition.y - 16,
        scale: isHovering ? 1.5 : 1,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
    >
      {/* Red Cricket Ball Styling */}
      <div className="w-full h-full rounded-full bg-[#aa0000] shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),0_0_10px_rgba(170,0,0,0.8)] relative overflow-hidden flex items-center justify-center">
        {/* The Seam */}
        <div className="w-[2px] h-full bg-white/60 absolute left-1/2 -translate-x-1/2 shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
      </div>
    </motion.div>
  )
}
