import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getProfile } from '@/app/actions/profile'
import { getRegistrationEnabled } from '@/app/actions/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminSettingsForm } from '@/components/admin-settings-form'

export default async function AdminPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/dashboard')
  }

  const profile = await getProfile()
  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  const registrationEnabled = await getRegistrationEnabled()

  return (
    <main className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">後台設定</h1>
        <Link href="/dashboard" className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent px-2.5 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground">
          返回
        </Link>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>會員功能</CardTitle>
          <CardDescription>控制使用者可以執行的操作</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSettingsForm registrationEnabled={registrationEnabled} />
        </CardContent>
      </Card>
    </main>
  )
}
