'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown, ChevronRight, Download, Upload } from 'lucide-react'
import type { Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { useActions } from '@/lib/actions-context'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#06b6d4', '#a855f7', '#64748b',
]

function formatNTD(n: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency', currency: 'TWD', minimumFractionDigits: 0,
  }).format(n)
}

// ── CSV helpers ──────────────────────────────────────────────

function toCSV(transactions: Transaction[]): string {
  const headers = ['日期', '金額', '幣別', '匯率', '類別', '子類別', '付款人', '備註']
  const rows = transactions.map((tx) => [
    tx.date,
    tx.amount,
    tx.currency || 'TWD',
    tx.exchange_rate ?? 1,
    tx.category,
    tx.subcategory ?? '',
    tx.paid_by,
    tx.note ?? '',
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): string[][] {
  const content = text.startsWith('\uFEFF') ? text.slice(1) : text
  return content
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const fields: string[] = []
      let field = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
          else inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          fields.push(field); field = ''
        } else {
          field += ch
        }
      }
      fields.push(field)
      return fields
    })
}

// ── Custom Tooltip ────────────────────────────────────────────

function CustomTooltip({ active, payload, total }: { active?: boolean; payload?: { name: string; value: number }[]; total: number }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-background border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{name}</p>
      <p>{formatNTD(value)}</p>
      <p className="text-muted-foreground">{total > 0 ? ((value / total) * 100).toFixed(1) : 0}%</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function ReportView({
  year,
  month,
  transactions,
  ledgerId,
}: {
  year: number
  month: number
  transactions: Transaction[]
  categories: Category[]
  ledgerId?: string
}) {
  const { importTransactions } = useActions()
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Build category totals (NTD converted)
  const catData = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const tx of transactions) {
      const ntd = tx.amount * (tx.exchange_rate ?? 1)
      totals[tx.category] = (totals[tx.category] ?? 0) + ntd
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [transactions])

  const total = catData.reduce((s, d) => s + d.value, 0)

  const colorOf = useMemo(() => {
    const map: Record<string, string> = {}
    catData.forEach((d) => { map[d.name] = d.color })
    return map
  }, [catData])

  // ── Export ──
  function handleExport() {
    const csv = toCSV(transactions)
    downloadCSV(csv, `做伙_${year}-${String(month).padStart(2, '0')}.csv`)
  }

  // ── Import ──
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length < 2) { toast.error('CSV 無有效資料'); return }

      const headers = rows[0]
      const idx = (name: string) => headers.indexOf(name)

      const importRows = rows.slice(1)
        .map((row) => ({
          date: row[idx('日期')] ?? row[0] ?? '',
          amount: parseFloat(row[idx('金額')] ?? row[1] ?? '0'),
          currency: row[idx('幣別')] ?? row[2] ?? 'TWD',
          exchange_rate: parseFloat(row[idx('匯率')] ?? row[3] ?? '1') || 1,
          category: row[idx('類別')] ?? row[4] ?? '',
          subcategory: row[idx('子類別')] ?? row[5] ?? '',
          paid_by: row[idx('付款人')] ?? row[6] ?? '',
          note: row[idx('備註')] ?? row[7] ?? '',
        }))
        .filter((r) => r.date && r.amount > 0 && r.category)

      if (importRows.length === 0) { toast.error('CSV 格式不正確或無有效資料'); return }

      const result = await importTransactions(importRows, ledgerId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`已匯入 ${result.imported} 筆消費記錄`)
        router.refresh()
      }
    } catch {
      toast.error('讀取檔案失敗')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Empty state ──
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card px-4 py-10 flex flex-col items-center gap-2 text-center">
          <p className="text-muted-foreground">本月無消費記錄</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="h-4 w-4" />{importing ? '匯入中…' : '匯入 CSV'}
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-scroll overscroll-contain flex flex-col gap-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Pie chart */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3 text-center">
          {year}年{month}月・共 {transactions.length} 筆・{formatNTD(total)}
        </p>
        <div className="relative" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={catData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {catData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">總支出</p>
            <p className="text-base font-bold leading-tight">{formatNTD(total)}</p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-xl border bg-card divide-y">
        {catData.map((cat) => {
          const catTxs = transactions.filter((tx) => tx.category === cat.name)
          const isOpen = expanded === cat.name
          return (
            <div key={cat.name}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : cat.name)}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorOf[cat.name] }} />
                <span className="flex-1 text-left font-medium">{cat.name}</span>
                <span className="text-muted-foreground text-xs">{catTxs.length}筆</span>
                <span className="font-semibold w-24 text-right">{formatNTD(cat.value)}</span>
                <span className="text-muted-foreground text-xs w-10 text-right">
                  {total > 0 ? ((cat.value / total) * 100).toFixed(0) : 0}%
                </span>
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isOpen && (
                <div className="bg-muted/30 divide-y">
                  {catTxs
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((tx) => (
                      <div key={tx.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground w-16 shrink-0">{tx.date.slice(5)}</span>
                        <span className="flex-1 text-muted-foreground truncate">
                          {tx.subcategory ? `${tx.subcategory}` : ''}
                          {tx.note ? (tx.subcategory ? `・${tx.note}` : tx.note) : ''}
                          {!tx.subcategory && !tx.note ? cat.name : ''}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{tx.paid_by}</span>
                        <span className="font-medium shrink-0 text-right">
                          {tx.currency !== 'TWD'
                            ? `${tx.currency} ${tx.amount}`
                            : formatNTD(tx.amount * (tx.exchange_rate ?? 1))}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Export / Import */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleExport}>
          <Download className="h-4 w-4" />匯出 CSV
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4" />{importing ? '匯入中…' : '匯入 CSV'}
        </Button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
      </div>
    </div>
  )
}
