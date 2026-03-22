'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type Category = {
  id: string
  name: string
  parent_id: string | null
  position: number
  subcategories: Category[]
}

// Default categories — additive sync: missing entries are inserted, existing ones are untouched.
const DEFAULT_CATEGORIES: { name: string; subs: string[] }[] = [
  {
    name: '餐飲',
    subs: ['早餐', '午餐', '晚餐', '宵夜', '飲料', '零食', '外送', '聚餐'],
  },
  {
    name: '交通',
    subs: ['捷運', '公車', '計程車', 'Uber', '停車費', '油費', '高鐵', '台鐵', '飛機', '機車維修', '汽車維修'],
  },
  {
    name: '購物',
    subs: ['超市／食材', '日用品', '衣物', '3C／電器', '傢俱', '書籍', '文具', '保養品'],
  },
  {
    name: '娛樂',
    subs: ['電影', 'KTV', '遊戲', '旅遊', '運動', '展覽', '演唱會', '訂閱服務'],
  },
  {
    name: '醫療健康',
    subs: ['掛號', '藥品', '保健品', '牙醫', '眼科', '健身房'],
  },
  {
    name: '居家',
    subs: ['房租', '水費', '電費', '瓦斯', '網路', '管理費', '修繕', '清潔用品'],
  },
  {
    name: '教育',
    subs: ['學費', '補習班', '線上課程', '書籍／講義', '考照／證照'],
  },
  {
    name: '美容',
    subs: ['美髮', '美甲', '美睫', '化妝品', '保養品'],
  },
  {
    name: '寵物',
    subs: ['飼料', '寵物醫療', '寵物美容', '寵物用品'],
  },
  {
    name: '保險',
    subs: ['健保費', '車險', '壽險', '意外險', '其他保險'],
  },
  {
    name: '人情往來',
    subs: ['婚喪喜慶', '禮物', '聚餐請客', '捐款'],
  },
  {
    name: '其他',
    subs: ['雜費', '罰款', '手續費'],
  },
]

// Additive sync: insert any default top-level categories (and their subs) not yet present for this user.
async function ensureDefaults(userId: string, existingNames: Set<string>) {
  const supabase = await createClient()
  const missing = DEFAULT_CATEGORIES.filter((d) => !existingNames.has(d.name))
  if (missing.length === 0) return

  for (let pi = 0; pi < missing.length; pi++) {
    const { name, subs } = missing[pi]
    const { data: parent } = await supabase
      .from('categories')
      .insert({ user_id: userId, name, position: 100 + pi })
      .select('id')
      .single()
    if (!parent) continue
    for (let si = 0; si < subs.length; si++) {
      await supabase.from('categories').insert({
        user_id: userId,
        name: subs[si],
        parent_id: parent.id,
        position: si,
      })
    }
  }
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Check if defaults have already been seeded for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('categories_seeded')
    .eq('id', user.id)
    .single()

  let rows: { id: string; name: string; parent_id: string | null; position: number }[] = []

  if (!profile?.categories_seeded) {
    // First time: fetch existing, seed missing defaults, mark as seeded
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    const existingNames = new Set(
      (data ?? []).filter((c) => c.parent_id === null).map((c) => c.name as string)
    )
    await ensureDefaults(user.id, existingNames)
    await supabase.from('profiles').update({ categories_seeded: true }).eq('id', user.id)

    // Re-fetch after seeding
    rows = (await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    ).data ?? []
  } else {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return []
    rows = data ?? []
  }

  const parents = rows.filter((c) => c.parent_id === null)
  return parents.map((p) => ({
    ...p,
    subcategories: rows
      .filter((c) => c.parent_id === p.id)
      .map((c) => ({ ...c, subcategories: [] })),
  }))
}

export async function createCategory(name: string, parentId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: name.trim(),
    parent_id: parentId ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const { error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

export async function updateCategoryPositions(
  updates: { id: string; position: number }[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  for (const { id, position } of updates) {
    await supabase
      .from('categories')
      .update({ position })
      .eq('id', id)
      .eq('user_id', user.id)
  }

  revalidatePath('/dashboard')
  return {}
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}
