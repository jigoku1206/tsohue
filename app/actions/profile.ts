'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  nickname: string
  updated_at: string
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateProfile(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const nickname = (formData.get('nickname') as string)?.trim()
  if (!nickname) return { error: '請填寫暱稱' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, nickname, updated_at: new Date().toISOString() })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return null
}
