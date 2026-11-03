import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()

function isPublicKey(value: string) {
  if (value.startsWith('sb_publishable_')) return true
  // Legacy anon keys are JWTs. Reject privileged server keys in browser config.
  try { return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon' } catch { return false }
}

export const isSupabaseConfigured = Boolean(url && /^https?:\/\//.test(url) && key && isPublicKey(key))
const preferenceKey = 'ertee.remember-session'

// Unchecked "Ingat saya" keeps credentials in this tab's session storage.
const storage = {
  getItem: (name: string) => localStorage.getItem(name) ?? sessionStorage.getItem(name),
  setItem(name: string, value: string) {
    // PKCE confirmation can open in a new tab; the SDK removes the verifier after exchange.
    const target = name.endsWith('-code-verifier') || localStorage.getItem(preferenceKey) === 'true' ? localStorage : sessionStorage
    const other = target === localStorage ? sessionStorage : localStorage
    other.removeItem(name)
    target.setItem(name, value)
  },
  removeItem(name: string) { localStorage.removeItem(name); sessionStorage.removeItem(name) },
}

export function setSessionPersistence(remember: boolean) {
  localStorage.setItem(preferenceKey, String(remember))
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage, flowType: 'pkce' },
    })
  : null

export function getSupabase() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}
