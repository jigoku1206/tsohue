'use client'

import { useEffect } from 'react'

export function ScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const preventTouch = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', preventTouch, { passive: false })
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('touchmove', preventTouch)
    }
  }, [])
  return null
}
