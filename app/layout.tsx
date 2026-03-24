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
    title: '做伙',
    statusBarStyle: 'black-translucent',
    startupImage: [
      {
        url: '/apple-touch-startup-image.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className={`${geistSans.variable} h-full antialiased`} style={{ backgroundColor: '#ffffff' }}>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        <SplashProvider>
          {children}
        </SplashProvider>
        <Toaster />
      </body>
    </html>
  )
}
