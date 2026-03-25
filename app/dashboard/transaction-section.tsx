import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/app/actions/transactions'
import { MonthController } from '@/components/month-controller'
import type { Category } from '@/app/actions/categories'

export async function TransactionSection({
  year,
  month,
  ledgerId,
  defaultCurrency,
  currentUserId,
  userNickname,
  isAdmin,
  categories,
}: {
  year: number
  month: number
  ledgerId?: string
  defaultCurrency?: string
  currentUserId: string
  userNickname: string
  isAdmin?: boolean
  categories: Category[]
}) {
  const supabase = await createClient()

  // Ensure the shared public ledger exists (moved here — only needed before transaction fetch)
  const { count: publicCount } = await supabase
    .from('ledgers')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', true)

  if (!publicCount) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('ledgers')
        .insert({ name: '作伙帳本', owner_id: user.id, is_public: true })
    }
  }

  const transactions = await getTransactions(year, month, ledgerId)

  return (
    <MonthController
      initialYear={year}
      initialMonth={month}
      initialTransactions={transactions}
      categories={categories}
      currentUserId={currentUserId}
      userNickname={userNickname}
      ledgerId={ledgerId}
      defaultCurrency={defaultCurrency}
      isAdmin={isAdmin}
    />
  )
}
