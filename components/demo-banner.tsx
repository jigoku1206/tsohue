'use client'

import { Info, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function DemoBanner({ onReset }: { onReset: () => void }) {
  const [dismissed, setDismissed] = useState(false)

  function handleReset() {
    if (!confirm('確定要重置所有 Demo 資料？此操作不可復原。')) return
    onReset()
  }

  if (dismissed) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
      <Info className="h-4 w-4 shrink-0" />
      <span className="flex-1">Demo 模式・資料儲存於您的瀏覽器，不會上傳至伺服器</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
        onClick={handleReset}
      >
        重置
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
        onClick={() => setDismissed(true)}
        aria-label="關閉"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
