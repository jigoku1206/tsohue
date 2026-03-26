'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const container = containerRef.current
    const loading = loadingRef.current
    if (!container || !loading) return

    // 防止 iOS bounce scroll 讓 splash 被拖動
    const preventTouch = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', preventTouch, { passive: false })

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

    // 1500ms 後淡出 → 顯示 loading
    const animationDone = new Promise<void>(resolve => {
      setTimeout(() => {
        const t = 'opacity 0.5s ease-out'
        container.style.transition = t
        container.style.opacity = '0'
        setTimeout(() => {
          container.style.display = 'none'
          document.removeEventListener('touchmove', preventTouch)
          loading.style.display = 'flex'
          resolve()
        }, 500)
      }, 1500)
    })

    // 動畫 + auth 都完成後才跳轉
    Promise.all([animationDone, authReady]).then(() => {
      router.replace(destination)
    })

    return () => {
      document.removeEventListener('touchmove', preventTouch)
    }
  }, [router])

  return (
    <>
      {/* 底圖：定位與 env() 透過 CSS class 處理 */}
      <div
        ref={containerRef}
        suppressHydrationWarning
        className="splash-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/splash/apple-splash-1170-2532.png"
          alt="做伙"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
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
