'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
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
