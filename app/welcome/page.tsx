'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const container = containerRef.current
    const progressContainer = progressContainerRef.current
    const progressFill = progressFillRef.current
    const loading = loadingRef.current
    if (!container || !progressContainer || !progressFill || !loading) return

    const safeAreaBottom = Math.max(window.screen.height - window.innerHeight, 0)
    container.style.height = `${window.screen.height}px`
    const barHeight = Math.max(safeAreaBottom, 34)
    progressContainer.style.height = `${barHeight}px`
    progressContainer.style.transform = `translateY(${safeAreaBottom}px)`

    // 立即開始 auth check（與動畫並行）
    let destination = '/login'
    const authReady = (async () => {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        destination = '/dashboard'
        return
      }
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      destination = user ? '/dashboard' : '/login'
      if (user) router.prefetch('/dashboard')
    })()

    // 進度條動畫（1500ms）→ 淡出（500ms）→ 顯示 loading
    const animationDone = new Promise<void>(resolve => {
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
        } else {
          cancelAnimationFrame(animFrame)
          const t = 'opacity 0.5s ease-out'
          container!.style.transition = t
          container!.style.opacity = '0'
          progressContainer!.style.transition = t
          progressContainer!.style.opacity = '0'
          setTimeout(() => {
            container!.style.display = 'none'
            progressContainer!.style.display = 'none'
            loading!.style.display = 'flex'
            resolve()
          }, 500)
        }
      }
      animFrame = requestAnimationFrame(animate)
    })

    // 動畫 + auth 都完成後才跳轉
    Promise.all([animationDone, authReady]).then(() => {
      router.replace(destination)
    })
  }, [router])

  return (
    <>
      {/* 底圖 */}
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

      {/* 進度條 */}
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

      {/* 載入中（動畫結束後顯示，等 auth 確認完成後跳轉） */}
      <div
        ref={loadingRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: '#ffffff',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <style>{`
          @keyframes _spin { to { transform: rotate(360deg); } }
        `}</style>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid rgba(0,0,0,0.1)',
            borderTopColor: '#1e7a8a',
            animation: '_spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 14, color: '#666' }}>載入中...</span>
      </div>
    </>
  )
}
