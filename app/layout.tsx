import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { SplashProvider } from './splash-provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '做伙 Tsohue',
  description: '輕鬆記錄、共同分攤的家庭帳本',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '做伙',
    startupImage: [
      // iPhone SE (1st gen) / iPod Touch — 640×1136
      { url: '/splash/apple-splash-640-1136.png', media: 'screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-1136-640.png', media: 'screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      // iPhone 6/7/8 / SE (2nd/3rd gen) — 750×1334
      { url: '/splash/apple-splash-750-1334.png', media: 'screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-1334-750.png', media: 'screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      // iPhone 6+/7+/8+ — 1242×2208
      { url: '/splash/apple-splash-1242-2208.png', media: 'screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2208-1242.png', media: 'screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPhone X/XS/11 Pro / 12 mini / 13 mini — 1125×2436
      { url: '/splash/apple-splash-1125-2436.png', media: 'screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2436-1125.png', media: 'screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPhone XR / 11 — 828×1792
      { url: '/splash/apple-splash-828-1792.png', media: 'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-1792-828.png', media: 'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      // iPhone XS Max / 11 Pro Max — 1242×2688
      { url: '/splash/apple-splash-1242-2688.png', media: 'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2688-1242.png', media: 'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPhone 12 / 13 / 14 — 1170×2532
      { url: '/splash/apple-splash-1170-2532.png', media: 'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2532-1170.png', media: 'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPhone 12 / 13 / 14 Pro Max — 1284×2778
      { url: '/splash/apple-splash-1284-2778.png', media: 'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2778-1284.png', media: 'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPhone 14 Pro — 1179×2556
      { url: '/splash/apple-splash-1179-2556.png', media: 'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2556-1179.png', media: 'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPhone 14 Pro Max / 15 / 15 Plus — 1290×2796
      { url: '/splash/apple-splash-1290-2796.png', media: 'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2796-1290.png', media: 'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
      // iPad / iPad mini — 1536×2048
      { url: '/splash/apple-splash-1536-2048.png', media: 'screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2048-1536.png', media: 'screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      // iPad Air / iPad Pro 10.5" — 1668×2224
      { url: '/splash/apple-splash-1668-2224.png', media: 'screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2224-1668.png', media: 'screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      // iPad Pro 11" — 1668×2388
      { url: '/splash/apple-splash-1668-2388.png', media: 'screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2388-1668.png', media: 'screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      // iPad Pro 12.9" — 2048×2732
      { url: '/splash/apple-splash-2048-2732.png', media: 'screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash/apple-splash-2732-2048.png', media: 'screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  viewportFit: 'cover',
  initialScale: 1,
}

// apple-mobile-web-app-status-bar-style must stay 'black-translucent'
// so that the webview extends under the status bar (paired with viewport-fit=cover).
// Without it, iOS renders an opaque white status bar on top of the full-bleed
// webview, and the body's padding-top:env(safe-area-inset-top) doubles the gap.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className={`${geistSans.variable} h-full antialiased`} style={{ backgroundColor: '#ffffffff' }}>
      <body className="min-h-dvh flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        <SplashProvider>
          {children}
        </SplashProvider>
        <Toaster />
      </body>
    </html>
  )
}
