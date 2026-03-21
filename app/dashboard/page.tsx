import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'
import { TransactionList } from '@/components/transaction-list'
import { CategoryManager } from '@/components/category-manager'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [transactions, categories] = await Promise.all([
    getTransactions(),
    getCategories(),
  ])

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0)

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

      {/* Summary */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">本月總支出</p>
        <p className="text-3xl font-bold">
          {new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0,
          }).format(total)}
        </p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">消費記錄</h2>
          <AddTransactionDialog userEmail={user.email ?? ''} categories={categories} />
        </div>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}
