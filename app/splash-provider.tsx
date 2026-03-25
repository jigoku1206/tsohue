'use client'

import { useEffect, useRef } from 'react'

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const splashRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = splashRef.current
    const content = contentRef.current
    if (!el || !content) return

    const fadeTimer = setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease-out'
      el.style.opacity = '0'
    }, 1500)

    const hideTimer = setTimeout(() => {
      el.style.display = 'none'
      content.style.visibility = 'visible'
    }, 2000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  return (
    <>
      <div
        ref={splashRef}
        suppressHydrationWarning
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 9999,
          backgroundColor: '#ffffff',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/splash/apple-splash-1290-2796.png"
          alt="做伙"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div ref={contentRef} style={{ visibility: 'hidden' }}>
        {children}
      </div>
    </>
  )
}
