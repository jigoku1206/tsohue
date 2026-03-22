'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { buttonVariants } from '@/components/ui/button'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      router.replace('/dashboard')
    }
  }, [router])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
      <Image src="/tsohue.jpg" alt="做伙" width={300} height={120} className="object-contain" priority />
      <h1 className="text-4xl font-bold">做伙 Thohue</h1>
      <p className="text-muted-foreground text-lg max-w-md">
        輕鬆記錄、即時同步的共同帳本。適合情侶、家庭或小團體。
      </p>
      <div className="flex gap-4">
        <Link href="/login" className={buttonVariants()}>
          登入
        </Link>
        <Link href="/register" className={buttonVariants({ variant: 'outline' })}>
          註冊
        </Link>
      </div>
    </main>
  )
}
