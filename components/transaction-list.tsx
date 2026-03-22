'use client'

import { useState } from 'react'
import { Pencil, Trash2, ChevronRight } from 'lucide-react'
import { deleteTransaction, type Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  )
}

export function TransactionList({
  transactions,
  categories,
  currentUserId,
  isAdmin,
}: {
  transactions: Transaction[]
  categories: Category[]
  currentUserId: string
  isAdmin?: boolean
}) {
  const [detail, setDetail] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)

  async function handleDelete() {
    if (!detail) return
    if (!confirm(`確定要刪除這筆記錄？`)) return
    setDeleting(true)
    const result = await deleteTransaction(detail.id)
    setDeleting(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('已刪除')
      setDetail(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        還沒有記錄，點擊「新增記錄」開始記帳！
      </p>
    )
  }

  const isOwner = detail?.user_id === currentUserId || isAdmin

  return (
    <>
      <ul className="flex flex-col gap-2">
        {transactions.map((tx) => (
          <li key={tx.id}>
            <button
              className="w-full flex items-center justify-between p-4 rounded-lg border bg-card gap-2 hover:bg-muted/50 transition-colors text-left"
              onClick={() => setDetail(tx)}
            >
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
                  {tx.paid_by}
                  {tx.note && ` · ${tx.note}`}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      {/* Detail dialog */}
      {detail && (
        <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>消費詳細</DialogTitle>
            </DialogHeader>

            {/* Amount hero */}
            <div className="bg-muted rounded-xl px-4 py-5 text-center my-1">
              <p className="text-3xl font-bold">{formatAmount(detail.amount, detail.currency ?? 'TWD')}</p>
              {detail.currency && detail.currency !== 'TWD' && (
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatNTD(detail.amount * (detail.exchange_rate ?? 1))} TWD
                </p>
              )}
            </div>

            <div className="px-1">
              <DetailRow label="日期" value={detail.date} />
              <DetailRow label="類別" value={
                <span className="flex items-center gap-1.5 justify-end flex-wrap">
                  <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{detail.category}</span>
                  {detail.subcategory && (
                    <span className="bg-muted/60 px-1.5 py-0.5 rounded text-xs text-muted-foreground">
                      {detail.subcategory}
                    </span>
                  )}
                </span>
              } />
              <DetailRow label="付款人" value={detail.paid_by} />
              {detail.currency !== 'TWD' && (
                <DetailRow label="幣別／匯率" value={`${detail.currency}（1:${(detail.exchange_rate ?? 1).toFixed(4)}）`} />
              )}
              {detail.note && <DetailRow label="備註" value={detail.note} />}
            </div>

            {isOwner && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />編輯
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-1.5"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />{deleting ? '刪除中…' : '刪除'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {editing && detail && (
        <EditTransactionDialog
          transaction={detail}
          categories={categories}
          open={editing}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(false)
              setDetail(null)
            }
          }}
        />
      )}
    </>
  )
}
