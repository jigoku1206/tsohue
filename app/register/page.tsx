'use client'

import { useActionState } from 'react'
import Link from 'next/link'
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
import { register } from '@/app/actions/auth'

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(register, null)

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>建立帳號</CardTitle>
          <CardDescription>加入做伙，開始共同記帳</CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="flex flex-col gap-4">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {state.error}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nickname">暱稱</Label>
              <Input id="nickname" name="nickname" type="text" required placeholder="你的暱稱" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">電子郵件</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="至少 6 個字元"
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '註冊中…' : '建立帳號'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              已有帳號？{' '}
              <Link href="/login" className="underline underline-offset-4">
                立即登入
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
