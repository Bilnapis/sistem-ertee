import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Feedback } from '../../components/Feedback'
import { getSupabase } from '../../lib/supabase'
import { authErrorMessage } from './errors'

export function SignOutButton({
  className = 'secondary-button',
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
    <div className="signout-area">
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
