import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { CalendarView } from '@/components/calendar-view'
import { CategoryManager } from '@/components/category-manager'
import { MonthPicker } from '@/components/month-picker'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  const [transactions, categories] = await Promise.all([
    getTransactions(year, month),
    getCategories(),
  ])

  const monthlyTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">做伙</h1>
        <div className="flex items-center gap-1">
          <CategoryManager initialCategories={categories} />
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">登出</Button>
          </form>
        </div>
      </header>

      {/* Monthly summary */}
      <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
        <MonthPicker year={year} month={month} />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">當月總支出</p>
          <p className="text-xl font-bold">
            {new Intl.NumberFormat('zh-TW', {
              style: 'currency',
              currency: 'TWD',
              minimumFractionDigits: 0,
            }).format(monthlyTotal)}
          </p>
        </div>
      </div>

      {/* Calendar + daily transactions */}
      <CalendarView
        year={year}
        month={month}
        transactions={transactions}
        categories={categories}
        userEmail={user.email ?? ''}
      />
    </div>
  )
}
