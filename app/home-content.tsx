'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SplashScreen } from './splash-screen'

export function HomeContent() {
  const router = useRouter()
  const [splashDone, setSplashDone] = useState(false)

  const handleDone = useCallback(() => {
    setSplashDone(true)
    router.replace('/dashboard')
  }, [router])

  if (splashDone) return null
  return <SplashScreen onDone={handleDone} />
}
