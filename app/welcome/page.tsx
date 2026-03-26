'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const container = containerRef.current
    const progressContainer = progressContainerRef.current
    const progressFill = progressFillRef.current
    if (!container || !progressContainer || !progressFill) return

    const safeAreaBottom = Math.max(window.screen.height - window.innerHeight, 0)
    container.style.height = `${window.screen.height}px`
    const barHeight = Math.max(safeAreaBottom, 34)
    progressContainer.style.height = `${barHeight}px`
    progressContainer.style.transform = `translateY(${safeAreaBottom}px)`

    const startTime = performance.now()
    const duration = 1500
    let animFrame: number

    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${progress * 100}%`
      }
      if (progress < 1) {
        animFrame = requestAnimationFrame(animate)
      }
    }
    animFrame = requestAnimationFrame(animate)

    const fadeTimer = setTimeout(() => {
      const t = 'opacity 0.5s ease-out'
      container.style.transition = t
      container.style.opacity = '0'
      progressContainer.style.transition = t
      progressContainer.style.opacity = '0'
    }, 1500)

    const redirectTimer = setTimeout(async () => {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        router.replace('/dashboard')
        return
      }
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      router.replace(user ? '/dashboard' : '/login')
    }, 2000)

    return () => {
      cancelAnimationFrame(animFrame)
      clearTimeout(fadeTimer)
      clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <>
      <div
        ref={containerRef}
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

      <div
        ref={progressContainerRef}
        suppressHydrationWarning
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            height: 3,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            ref={progressFillRef}
            style={{
              height: '100%',
              width: '0%',
              backgroundColor: '#1e7a8a',
            }}
          />
        </div>
      </div>
    </>
  )
}
