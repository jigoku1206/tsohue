'use client'

import { useEffect, useRef } from 'react'

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const splashRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = splashRef.current
    const content = contentRef.current
    if (!el || !content) return

    // 只在 PWA standalone 模式下顯示 splash（一般瀏覽器分頁直接跳過）
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone) return
    if (window.location.pathname === '/welcome') return

    // 顯示 splash、隱藏內容
    el.style.display = 'block'
    content.style.visibility = 'hidden'
    content.style.height = '0'
    content.style.overflow = 'hidden'

    // 防止 iOS bounce scroll 讓 splash 被拖動
    const preventTouch = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', preventTouch, { passive: false })

    // 1.5s 後淡出 splash
    const fadeTimer = setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease-out'
      el.style.opacity = '0'
    }, 1500)

    const hideTimer = setTimeout(() => {
      el.style.display = 'none'
      content.style.height = ''
      content.style.overflow = ''
      content.style.visibility = 'visible'
      document.removeEventListener('touchmove', preventTouch)
    }, 2000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
      document.removeEventListener('touchmove', preventTouch)
    }
  }, [])

  return (
    <>
      {/* Splash 圖片層：定位與 env() 透過 CSS class 處理，inline style 只控制 display */}
      <div
        ref={splashRef}
        suppressHydrationWarning
        className="splash-screen"
        style={{ display: 'none' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/splash/apple-splash-1170-2532.png"
          alt="做伙"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div ref={contentRef} className="flex flex-col flex-1">
        {children}
      </div>
    </>
  )
}
