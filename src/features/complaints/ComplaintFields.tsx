import { useId } from 'react'
import type { ComponentProps } from 'react'

export function ComplaintSelect({
  label,
  error,
  children,
  ...props
}: ComponentProps<'select'> & { label: string; error?: string }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="text-sm leading-5 font-semibold text-slate-700">
        <label htmlFor={id}>{label}</label>
        {props.required ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </div>
      <select
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-base leading-6 text-ellipsis text-ink hover:border-slate-600 disabled:bg-soft disabled:text-muted aria-invalid:border-danger"
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ComplaintTextarea({
  label,
  error,
  helperText,
  ...props
}: ComponentProps<'textarea'> & {
  label: string
  error?: string
  helperText?: string
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="text-sm leading-5 font-semibold text-slate-700">
        <label htmlFor={id}>{label}</label>
        {props.required ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </div>
      <textarea
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [helperText ? `${id}-helper` : '', error ? `${id}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        className="min-h-28 w-full min-w-0 resize-y rounded-control border border-control-border bg-surface px-3 py-3 text-base leading-6 text-ink placeholder:text-muted hover:border-slate-600 disabled:bg-soft aria-invalid:border-danger"
      />
      {helperText ? (
        <p id={`${id}-helper`} className="text-xs leading-normal text-muted">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
