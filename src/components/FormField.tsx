import { Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  visible?: boolean
  onToggleVisibility?: () => void
  hiddenIcon?: 'eye' | 'eye-off'
}

export function FormField({ label, error, id, visible, onToggleVisibility, hiddenIcon = 'eye-off', type, ...props }: Props) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="input-wrap">
      <input {...props} id={id} type={type === 'password' && visible ? 'text' : type}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : props['aria-describedby']}
        className={onToggleVisibility ? 'has-trailing-icon' : undefined} />
      {onToggleVisibility ? <button type="button" className="eye-button" onClick={onToggleVisibility}
        aria-label={`${visible ? 'Sembunyikan' : 'Tampilkan'} ${label.replace(' *', '').toLowerCase()}`}
        aria-pressed={Boolean(visible)}>{(hiddenIcon === 'eye') !== Boolean(visible) ? <Eye size={20} /> : <EyeOff size={20} />}</button> : null}
    </div>
    {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : null}
  </div>
}
