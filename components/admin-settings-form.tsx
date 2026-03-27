'use client'

import { useActionState } from 'react'
import { setRegistrationEnabled } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function AdminSettingsForm({ registrationEnabled }: { registrationEnabled: boolean }) {
  const [, action, isPending] = useActionState(setRegistrationEnabled, null)

  return (
    <form action={action} className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label>開放註冊</Label>
        <p className="text-sm text-muted-foreground">
          {registrationEnabled ? '目前開放新用戶註冊' : '目前不開放新用戶註冊'}
        </p>
      </div>
      <input
        type="hidden"
        name="registration_enabled"
        value={registrationEnabled ? 'false' : 'true'}
      />
      <Button
        type="submit"
        variant={registrationEnabled ? 'destructive' : 'default'}
        size="sm"
        disabled={isPending}
      >
        {isPending ? '更新中…' : registrationEnabled ? '關閉註冊' : '開放註冊'}
      </Button>
    </form>
  )
}
