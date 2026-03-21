'use client'

import { useState } from 'react'
import { deleteTransaction, type Transaction } from '@/app/actions/transactions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function formatNTD(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const result = await deleteTransaction(id)
    setDeleting(null)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('已刪除')
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        還沒有記錄，點擊「新增記錄」開始記帳！
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatNTD(tx.amount)}</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{tx.category}</span>
              {tx.subcategory && (
                <span className="text-xs bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                  {tx.subcategory}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {tx.date} · 付款人：{tx.paid_by}
              {tx.note && ` · ${tx.note}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(tx.id)}
            disabled={deleting === tx.id}
            className="text-destructive hover:text-destructive"
          >
            刪除
          </Button>
        </li>
      ))}
    </ul>
  )
}
