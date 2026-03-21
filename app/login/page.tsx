'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, null)

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>登入您的做伙帳號</CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="flex flex-col gap-4">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {state.error}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">電子郵件</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">密碼</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '登入中…' : '登入'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              還沒有帳號？{' '}
              <Link href="/register" className="underline underline-offset-4">
                立即註冊
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
