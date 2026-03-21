'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type AuthState = { error: string } | null

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function register(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()

  const nickname = (formData.get('nickname') as string)?.trim()
  if (!nickname) return { error: '請填寫暱稱' }

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: '註冊失敗，請稍後再試' }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, nickname, email: formData.get('email') as string })

  if (profileError) return { error: profileError.message }

  // Create the shared public ledger if it doesn't exist yet
  const { count } = await supabase
    .from('ledgers')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', true)

  if (!count) {
    await supabase
      .from('ledgers')
      .insert({ name: '作伙帳本', owner_id: data.user.id, is_public: true })
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
