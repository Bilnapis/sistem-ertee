import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Feedback } from '../../components/Feedback'
import { getSupabase } from '../../lib/supabase'
import { authErrorMessage } from './errors'

export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setPending(true)
    setError('')
    try {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <button
        className={
          className ??
          'inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0'
        }
        type="button"
        disabled={pending}
        onClick={signOut}
      >
        <LogOut size={18} aria-hidden="true" />
        {pending ? 'Sedang keluar…' : 'Keluar'}
      </button>
      {error ? <Feedback>{error}</Feedback> : null}
    </div>
  )
}
