'use client'

import { useState } from 'react'
import { UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActions } from '@/lib/actions-context'
import { toast } from 'sonner'

export function DemoProfileDialog({ nickname: initialNickname }: { nickname: string }) {
  const { updateProfile } = useActions()
  const [open, setOpen] = useState(false)
  const [nickname, setNickname] = useState(initialNickname)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await updateProfile(null, formData)
    setLoading(false)
    if (result) {
      setError(result.error)
    } else {
      toast.success('個人資料已更新')
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="個人資料">
        <UserCircle className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>個人資料</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                name="nickname"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的暱稱"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '儲存中…' : '儲存'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
