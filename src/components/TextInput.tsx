import { cn } from '../lib/cn'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Button } from './Button'

export type TextInputProps = ComponentPropsWithRef<'input'> & {
  label: string
  hideLabel?: boolean
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
  hideLabel = false,
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
    <div
      className={cn(
        'group/field flex w-full min-w-0 flex-col gap-[var(--text-input-gap,0.25rem)] text-start',
        wrapperClassName,
      )}
    >
      <div
        className={cn(
          'text-sm leading-5 wrap-anywhere',
          hideLabel && 'sr-only',
        )}
      >
        <label
          className="text-sm leading-5 font-semibold wrap-anywhere text-slate-700 group-has-disabled/field:text-muted"
          htmlFor={inputId}
        >
          {label}
        </label>
        {required && !label.trimEnd().endsWith('*') ? (
          <span
            className="text-danger group-has-disabled/field:text-muted"
            aria-hidden="true"
          >
            {' '}
            *
          </span>
        ) : null}
      </div>
      <div
        className="flex min-h-[var(--text-input-min-height,3rem)] min-w-0 items-center gap-3 rounded-control border border-control-border bg-surface px-3 text-muted shadow-[0_1px_2px_oklch(0_0_0/0.03)] focus-within:border-action focus-within:text-action focus-within:ring-3 focus-within:ring-focus-soft hover:not-focus-within:not-data-[invalid]:not-has-disabled:border-slate-600 has-disabled:cursor-not-allowed has-disabled:border-border has-disabled:bg-soft has-disabled:text-muted has-disabled:shadow-none has-disabled:ring-0 has-disabled:outline-none has-[:focus-visible]:outline has-[:focus-visible]:outline-action has-[input[readonly]]:bg-page data-[invalid]:border-danger data-[invalid]:focus-within:ring-danger-soft has-disabled:data-[invalid]:border-border data-[invalid]:has-[:focus-visible]:outline-danger motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-150 motion-safe:ease-out forced-colors:border-[ButtonText] forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-offset-2 forced-colors:focus-within:outline-[Highlight] forced-colors:has-disabled:border-[GrayText] forced-colors:has-[:focus-visible]:outline-2 forced-colors:has-[:focus-visible]:outline-offset-2 forced-colors:has-[:focus-visible]:outline-[Highlight] forced-colors:data-[invalid]:border-dashed"
        data-invalid={hasError || undefined}
      >
        {leadingIcon ? (
          <span
            className="inline-flex flex-none [&>svg]:size-5 [&>svg]:stroke-[1.75]"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          {...props}
          id={inputId}
          type={type === 'password' && visible ? 'text' : type}
          className={cn(
            'block min-h-[calc(var(--text-input-min-height,3rem)-2px)] w-full min-w-0 flex-1 rounded-[inherit] border-0 bg-transparent px-0 py-px text-start font-sans text-base leading-6 text-ink placeholder:text-muted placeholder:opacity-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted disabled:opacity-100 disabled:[-webkit-text-fill-color:currentColor]',
            className,
          )}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : invalid}
          aria-describedby={descriptionIds}
          aria-errormessage={errorId ?? props['aria-errormessage']}
        />
        {hasError ? (
          <CircleAlert
            className="flex-none text-danger group-has-disabled/field:text-muted"
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : null}
        {onToggleVisibility ? (
          <span className="-me-3 inline-flex shrink-0">
            <Button
              type="button"
              disabled={disabled}
              onClick={onToggleVisibility}
              data-static={isStatic || undefined}
              aria-label={`${visible ? 'Sembunyikan' : 'Tampilkan'} ${label.replace(/\s*\*$/, '').toLocaleLowerCase('id-ID')}`}
              aria-pressed={visible}
              variant="ghost"
              size="icon"
              leadingIcon={
                <span className="grid" aria-hidden="true">
                  <Eye
                    className="col-start-1 row-start-1 opacity-0 transition-opacity duration-150 ease-ui data-[shown]:opacity-100 motion-safe:scale-25 motion-safe:blur-[4px] motion-safe:transition-[opacity,scale,filter] motion-safe:duration-300 motion-safe:data-[shown]:scale-100 motion-safe:data-[shown]:blur-none"
                    data-shown={showEye || undefined}
                    size={20}
                    strokeWidth={1.75}
                  />
                  <EyeOff
                    className="col-start-1 row-start-1 opacity-0 transition-opacity duration-150 ease-ui data-[shown]:opacity-100 motion-safe:scale-25 motion-safe:blur-[4px] motion-safe:transition-[opacity,scale,filter] motion-safe:duration-300 motion-safe:data-[shown]:scale-100 motion-safe:data-[shown]:blur-none"
                    data-shown={!showEye || undefined}
                    size={20}
                    strokeWidth={1.75}
                  />
                </span>
              }
            />
          </span>
        ) : null}
      </div>
      {helperText ? (
        <p
          className="m-0 text-xs leading-[1.125rem] wrap-anywhere text-muted"
          id={helperId}
        >
          {helperText}
        </p>
      ) : null}
      <p
        className="m-0 text-xs leading-[1.125rem] wrap-anywhere text-danger empty:sr-only"
        id={`${inputId}-error`}
        aria-live="polite"
        aria-atomic="true"
      >
        {error || null}
      </p>
    </div>
  )
}
