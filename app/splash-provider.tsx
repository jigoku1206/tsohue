'use client'

import { useEffect, useRef } from 'react'

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const splashRef = useRef<HTMLDivElement>(null)
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = splashRef.current
    const progressContainer = progressContainerRef.current
    const progressFill = progressFillRef.current
    const content = contentRef.current
    if (!el || !progressContainer || !progressFill || !content) return

    // screen.height 回傳完整螢幕 CSS 像素（含 home indicator 區域）
    // innerHeight 在 iOS PWA 通常不含 home indicator 安全區
    const safeAreaBottom = Math.max(window.screen.height - window.innerHeight, 0)

    // Splash 填滿完整螢幕
    el.style.height = `${window.screen.height}px`
    el.style.bottom = '0px'

    // 進度條容器：固定在底部，用 translateY 推入實際安全區域
    const barHeight = Math.max(safeAreaBottom, 34)
    progressContainer.style.height = `${barHeight}px`
    progressContainer.style.transform = `translateY(${safeAreaBottom}px)`
    // rAF 動畫（Safari 相容，不依賴 CSS keyframes）
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

    // 1.5s 後同時淡出 splash + 進度條
    const fadeTimer = setTimeout(() => {
      const t = 'opacity 0.5s ease-out'
      el.style.transition = t
      el.style.opacity = '0'
      progressContainer.style.transition = t
      progressContainer.style.opacity = '0'
    }, 1500)

    const hideTimer = setTimeout(() => {
      el.style.display = 'none'
      progressContainer.style.display = 'none'
      content.style.height = ''
      content.style.overflow = ''
      content.style.visibility = 'visible'
    }, 2000)

    return () => {
      cancelAnimationFrame(animFrame)
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  return (
    <>
      {/* Splash 圖片層 */}
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

      {/* 進度條層（獨立 fixed div，高於 splash） */}
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

      <div
        ref={contentRef}
        style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}
      >
        {children}
      </div>
    </>
  )
}
