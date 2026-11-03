import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { ResidentProfile } from '../../lib/database.types'
import { authErrorMessage } from './errors'

type AuthState = {
  session: Session | null
  profile: ResidentProfile | null
  loading: boolean
  error: string | null
  retry: () => void
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(!supabase)
  const [profileState, setProfileState] = useState<{ token: string; profile: ResidentProfile | null; error: string | null } | null>(null)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (!supabase) return
    // Keep the callback synchronous; API reads run in the separate effect below.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setInitialized(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const token = session?.access_token
  useEffect(() => {
    if (!supabase || !token) return
    const client = supabase
    let cancelled = false
    const controller = new AbortController()
    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await client.auth.getUser(token)
        if (userError) throw userError
        if (!user) throw new Error('PROFILE_UNAVAILABLE')
        const { data, error } = await client.from('profiles').select('*').eq('id', user.id).abortSignal(controller.signal).maybeSingle()
        if (error) throw error
        if (!data?.is_active) throw new Error('PROFILE_UNAVAILABLE')
        if (!cancelled) setProfileState({ token: token!, profile: data, error: null })
      } catch (error) {
        if (!cancelled) setProfileState({ token: token!, profile: null, error: authErrorMessage(error) })
      }
    }
    void loadProfile()
    // Recheck status for an already logged-in account; RLS applies on every read.
    const interval = window.setInterval(loadProfile, 60_000)
    window.addEventListener('focus', loadProfile)
    return () => { cancelled = true; controller.abort(); window.clearInterval(interval); window.removeEventListener('focus', loadProfile) }
  }, [token, revision])

  const currentProfile = token && profileState?.token === token ? profileState : null
  return <AuthContext.Provider value={{
    session,
    profile: currentProfile?.profile ?? null,
    loading: !initialized || Boolean(token && !currentProfile),
    error: currentProfile?.error ?? null,
    retry,
  }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}
