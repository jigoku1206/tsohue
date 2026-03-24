'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const fadeOut = setTimeout(() => setOpacity(0), 1200)
    const done = setTimeout(() => setShowSplash(false), 1900)
    return () => {
      clearTimeout(fadeOut)
      clearTimeout(done)
    }
  }, [])

  return (
    <>
      {showSplash && (
        <div
          style={{
            opacity,
            transition: 'opacity 0.7s ease-in-out',
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            backgroundColor: '#ffffff',
            pointerEvents: 'none',
          }}
        >
          <Image src="/tsohue.jpg" alt="做伙" width={200} height={200} style={{ objectFit: 'contain' }} priority />
          <span style={{ fontSize: '1.875rem', fontWeight: 700 }}>做伙 Tsohue</span>
        </div>
      )}
      {children}
    </>
  )
}
