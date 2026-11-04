import { buttons } from '../../components/ui'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Feedback } from '../../components/Feedback'
import { getSupabase } from '../../lib/supabase'
import { authErrorMessage } from './errors'

export function SignOutButton({
  className = buttons.secondary,
}: {
  className?: string
}) {
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
        className={className}
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
