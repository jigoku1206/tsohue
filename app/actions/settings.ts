'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getRegistrationEnabled(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'registration_enabled')
    .single()
  // Default to true if setting doesn't exist yet
  return data == null || data.value !== false
}

export async function setRegistrationEnabled(
  _prevState: null,
  formData: FormData
): Promise<null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Forbidden')

  const enabled = formData.get('registration_enabled') === 'true'

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'registration_enabled', value: enabled })

  if (error) throw new Error(error.message)

  revalidatePath('/register')
  revalidatePath('/admin')
  return null
}
