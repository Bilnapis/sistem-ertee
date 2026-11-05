import type { ButtonStyleProps } from '../../components/Button'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { getSupabase } from '../../lib/supabase'
import { authErrorMessage } from './errors'

export function SignOutButton({
  variant = 'outline',
  size,
  width,
  align,
}: Pick<ButtonStyleProps, 'variant' | 'size' | 'width' | 'align'>) {
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
      <Button
        type="button"
        disabled={pending}
        onClick={signOut}
        variant={variant}
        size={size}
        width={width}
        align={align}
        leadingIcon={<LogOut size={18} aria-hidden="true" />}
      >
        {pending ? 'Sedang keluar…' : 'Keluar'}
      </Button>
      {error ? <Feedback>{error}</Feedback> : null}
    </div>
  )
}
