'use client'

import { useActionState, useState } from 'react'
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
import { updateProfile } from '@/app/actions/profile'
import { toast } from 'sonner'

export function ProfileDialog({
  email,
  nickname: initialNickname,
}: {
  email: string
  nickname: string
}) {
  const [open, setOpen] = useState(false)

  async function handleAction(
    prevState: { error: string } | null,
    formData: FormData
  ) {
    const result = await updateProfile(prevState, formData)
    if (!result) {
      toast.success('個人資料已更新')
      setOpen(false)
    }
    return result
  }

  const [state, action, isPending] = useActionState(handleAction, null)

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
          <form action={action} className="flex flex-col gap-4 mt-2">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {state.error}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>電子郵件</Label>
              <Input value={email} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                name="nickname"
                required
                defaultValue={initialNickname}
                placeholder="你的暱稱"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? '儲存中…' : '儲存'}
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
