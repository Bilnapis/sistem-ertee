import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import styles from './TextInput.module.css'

export type TextInputProps = ComponentPropsWithRef<'input'> & {
  label: string
  helperText?: string
  error?: string
  leadingIcon?: ReactNode
  wrapperClassName?: string
  visible?: boolean
  onToggleVisibility?: () => void
  hiddenIcon?: 'eye' | 'eye-off'
  /** Keep the password button still when a press scale would distract. */
  static?: boolean
}

/** Idle → active follows native focus; error and disabled take visual priority. */
export function TextInput({
  label,
  helperText,
  error,
  leadingIcon,
  wrapperClassName,
  id,
  className,
  visible = false,
  onToggleVisibility,
  hiddenIcon = 'eye-off',
  type = 'text',
  disabled,
  required,
  static: isStatic = false,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: TextInputProps) {
  const generatedId = useId()
  const inputId = id ?? `text-input-${generatedId}`
  const helperId = helperText ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const descriptionIds =
    [describedBy, helperId, errorId].filter(Boolean).join(' ') || undefined
  const hasError = Boolean(error) || invalid === true || invalid === 'true'
  const showEye = (hiddenIcon === 'eye') !== visible

  return (
    <div className={[styles.field, wrapperClassName].filter(Boolean).join(' ')}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        {required && !label.trimEnd().endsWith('*') ? (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </div>
      <div className={styles.control} data-invalid={hasError || undefined}>
        {leadingIcon ? (
          <span className={styles.leadingIcon} aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <input
          {...props}
          id={inputId}
          type={type === 'password' && visible ? 'text' : type}
          className={[styles.input, className].filter(Boolean).join(' ')}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : invalid}
          aria-describedby={descriptionIds}
          aria-errormessage={errorId ?? props['aria-errormessage']}
        />
        {hasError ? (
          <CircleAlert
            className={styles.errorIcon}
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : null}
        {onToggleVisibility ? (
          <button
            type="button"
            className={styles.visibilityButton}
            disabled={disabled}
            onClick={onToggleVisibility}
            data-static={isStatic || undefined}
            aria-label={`${visible ? 'Sembunyikan' : 'Tampilkan'} ${label.replace(/\s*\*$/, '').toLocaleLowerCase('id-ID')}`}
            aria-pressed={visible}
          >
            <span className={styles.visibilityIcons} aria-hidden="true">
              <Eye
                className={styles.visibilityIcon}
                data-shown={showEye || undefined}
                size={20}
                strokeWidth={1.75}
              />
              <EyeOff
                className={styles.visibilityIcon}
                data-shown={!showEye || undefined}
                size={20}
                strokeWidth={1.75}
              />
            </span>
          </button>
        ) : null}
      </div>
      {helperText ? (
        <p className={styles.helper} id={helperId}>
          {helperText}
        </p>
      ) : null}
      <p
        className={styles.error}
        id={`${inputId}-error`}
        aria-live="polite"
        aria-atomic="true"
      >
        {error || null}
      </p>
    </div>
  )
}
