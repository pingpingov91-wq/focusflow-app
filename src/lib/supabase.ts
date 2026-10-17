import { createClient } from '@supabase/supabase-js'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(projectUrl && publicKey)
export const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim() ?? ''
export const isRegistrationConfigured = isSupabaseConfigured && Boolean(supportEmail)

export const supabase = projectUrl && publicKey
  ? createClient(projectUrl, publicKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null
