'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const fadeOut = setTimeout(() => setOpacity(0), 1200)
    const done = setTimeout(onDone, 1900)
    return () => {
      clearTimeout(fadeOut)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      style={{ opacity, transition: 'opacity 0.7s ease-in-out' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white pointer-events-none"
    >
      <Image src="/tsohue.jpg" alt="做伙" width={200} height={80} className="object-contain" priority />
      <span className="text-3xl font-bold">做伙 Tsohue</span>
    </div>
  )
}
