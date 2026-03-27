import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegisterForm } from '@/components/register-form'
import { ScrollLock } from '@/components/scroll-lock'
import { getRegistrationEnabled } from '@/app/actions/settings'

export default async function RegisterPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    redirect('/dashboard')
  }

  const registrationEnabled = await getRegistrationEnabled()

  return (
    <>
    <ScrollLock />
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>建立帳號</CardTitle>
          <CardDescription>加入做伙，開始共同記帳</CardDescription>
        </CardHeader>
        {registrationEnabled ? (
          <RegisterForm />
        ) : (
          <>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                目前不開放註冊，請聯絡管理員。
              </p>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground">暱稱</Label>
                <Input type="text" disabled placeholder="你的暱稱" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground">電子郵件</Label>
                <Input type="email" disabled placeholder="you@example.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground">密碼</Label>
                <Input type="password" disabled placeholder="至少 6 個字元" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="button" className="w-full" disabled>
                建立帳號
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                已有帳號？{' '}
                <Link href="/login" className="underline underline-offset-4">
                  立即登入
                </Link>
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </main>
    </>
  )
}
