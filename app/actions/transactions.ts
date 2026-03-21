'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Transaction = {
  id: string
  date: string
  amount: number
  category: string
  subcategory: string | null
  note: string | null
  paid_by: string
  user_id: string
  created_at: string
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)

  if (error) return []
  return data ?? []
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '未登入' }

  const subcategory = (formData.get('subcategory') as string) || null
  const { error } = await supabase.from('transactions').insert({
    date: formData.get('date') as string,
    amount: parseFloat(formData.get('amount') as string),
    category: formData.get('category') as string,
    subcategory,
    note: (formData.get('note') as string) || null,
    paid_by: formData.get('paid_by') as string,
    user_id: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}
