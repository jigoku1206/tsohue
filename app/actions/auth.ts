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

  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'registration_enabled')
    .maybeSingle()

  if (setting && setting.value === false) {
    return { error: '目前不開放註冊，請聯絡管理員。' }
  }

  const nickname = (formData.get('nickname') as string)?.trim()
  if (!nickname) return { error: '請填寫暱稱' }
  if (nickname.length > 80) return { error: '暱稱過長' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  if (!email || !email.includes('@')) return { error: '電子郵件格式不正確' }
  if (!password || password.length < 6) return { error: '密碼至少需要 6 個字元' }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: '註冊失敗，請稍後再試' }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: data.user.id, nickname, email })

  if (profileError && data.session) return { error: profileError.message }

  // Create the shared public ledger if it doesn't exist yet
  const { count } = await supabase
    .from('ledgers')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', true)

  if (!count) {
    const { error: ledgerError } = await supabase
      .from('ledgers')
      .insert({ name: '作伙帳本', owner_id: data.user.id, is_public: true })
    if (ledgerError && ledgerError.code !== '23505') return { error: ledgerError.message }
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

export async function changePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) return { error: '兩次輸入的密碼不一致' }
  if (password.length < 6) return { error: '密碼至少需要 6 個字元' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  // Revoke all refresh tokens across all devices
  await supabase.auth.signOut({ scope: 'global' })

  revalidatePath('/', 'layout')
  redirect('/login')
}
