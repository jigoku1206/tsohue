'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Ledger = {
  id: string
  name: string
  owner_id: string
  is_public: boolean
  default_currency: string
  created_at: string
}

export type LedgerMember = {
  user_id: string
  nickname: string
  email: string | null
}

export type UserProfile = {
  id: string
  nickname: string
  email: string | null
}

export async function getLedgers(): Promise<Ledger[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ledgers')
    .select('*')
    .order('is_public', { ascending: false })
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function createLedger(
  name: string
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const { data, error } = await supabase
    .from('ledgers')
    .insert({ name, owner_id: user.id, is_public: false })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { id: data.id }
}

export async function updateLedger(
  id: string,
  name: string,
  defaultCurrency?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const update: Record<string, string> = { name }
  if (defaultCurrency) update.default_currency = defaultCurrency
  const { error } = await supabase.from('ledgers').update(update).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function deleteLedger(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('ledgers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function getLedgerMembers(ledgerId: string): Promise<LedgerMember[]> {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('ledger_members')
    .select('user_id')
    .eq('ledger_id', ledgerId)

  if (!members?.length) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .in('id', userIds)

  return userIds.map((uid) => {
    const p = profiles?.find((p) => p.id === uid)
    return { user_id: uid, nickname: p?.nickname ?? uid, email: p?.email ?? null }
  })
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .neq('id', user.id)
    .order('nickname', { ascending: true })

  return data ?? []
}

export async function setLedgerMembers(
  ledgerId: string,
  userIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Fetch current members
  const { data: current } = await supabase
    .from('ledger_members')
    .select('user_id')
    .eq('ledger_id', ledgerId)

  const currentIds = (current ?? []).map((m) => m.user_id)
  const toAdd = userIds.filter((id) => !currentIds.includes(id))
  const toRemove = currentIds.filter((id) => !userIds.includes(id))

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('ledger_members')
      .delete()
      .eq('ledger_id', ledgerId)
      .in('user_id', toRemove)
    if (error) return { error: error.message }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('ledger_members')
      .insert(toAdd.map((user_id) => ({ ledger_id: ledgerId, user_id })))
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard')
  return {}
}

export async function addLedgerMemberByEmail(
  ledgerId: string,
  email: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) return { error: '找不到此電子郵件的使用者' }

  const { error } = await supabase
    .from('ledger_members')
    .insert({ ledger_id: ledgerId, user_id: profile.id })

  if (error) {
    if (error.code === '23505') return { error: '該使用者已在帳本中' }
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return {}
}

export async function removeLedgerMember(
  ledgerId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ledger_members')
    .delete()
    .eq('ledger_id', ledgerId)
    .eq('user_id', userId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}
