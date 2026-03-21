'use client'

import { useState } from 'react'
import { deleteTransaction, type Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { EditTransactionDialog } from '@/components/edit-transaction-dialog'
import { formatAmount } from '@/lib/currencies'
import { toast } from 'sonner'

function formatNTD(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function TransactionList({
  transactions,
  categories,
  currentUserId,
}: {
  transactions: Transaction[]
  categories: Category[]
  currentUserId: string
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)

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
    <>
      <ul className="flex flex-col gap-2">
        {transactions.map((tx) => {
          const isOwner = tx.user_id === currentUserId
          return (
            <li key={tx.id} className="flex items-center justify-between p-4 rounded-lg border bg-card gap-2">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{formatAmount(tx.amount, tx.currency ?? 'TWD')}</span>
                  {tx.currency && tx.currency !== 'TWD' && (
                    <span className="text-xs text-muted-foreground">
                      ≈ {formatNTD(tx.amount * (tx.exchange_rate ?? 1))}
                    </span>
                  )}
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{tx.category}</span>
                  {tx.subcategory && (
                    <span className="text-xs bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                      {tx.subcategory}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {tx.date} · 付款人：{tx.paid_by}
                  {tx.note && ` · ${tx.note}`}
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(tx)}
                    className="h-8 px-2 text-xs"
                  >
                    編輯
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    刪除
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {editing && (
        <EditTransactionDialog
          transaction={editing}
          categories={categories}
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(null) }}
        />
      )}
    </>
  )
}
