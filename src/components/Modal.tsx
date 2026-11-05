import { useEffect, useId, useRef } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../lib/cn'
import './Modal.css'

type ModalProps = {
  id?: string
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  pending?: boolean
  placement?: 'center' | 'start'
}

export function Modal({
  id,
  title,
  description,
  children,
  onClose,
  pending = false,
  placement = 'center',
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const node = dialog.current!
    const previousFocus = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      id={id}
      ref={dialog}
      className={
        placement === 'start'
          ? 'app-drawer fixed inset-y-0 start-0 end-auto m-0 h-dvh max-h-dvh w-sidebar max-w-[calc(100%-1.5rem)] overflow-hidden border-0 bg-transparent p-0 backdrop:bg-ink/60'
          : 'fixed m-auto max-h-[calc(100dvh-2rem)] w-[min(1000px,calc(100%-2rem))] max-w-none flex-col overflow-hidden rounded-xl border-0 bg-surface p-7 text-ink shadow-dialog backdrop:bg-ink/60 open:flex max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100%-1.5rem)] max-sm:p-5'
      }
      aria-label={placement === 'start' ? title : undefined}
      aria-labelledby={placement === 'center' ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      closedby={pending ? 'none' : 'any'}
      onKeyDown={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('dialog') !== event.currentTarget
        )
          return
        if (event.key === 'Tab') {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter(
            (node) =>
              node.tabIndex >= 0 &&
              !node.matches(':disabled') &&
              node.getClientRects().length > 0,
          )
          const first = controls[0]
          const last = controls.at(-1)
          if (!first) event.preventDefault()
          if (
            (!event.shiftKey && document.activeElement === last) ||
            (event.shiftKey && document.activeElement === first)
          ) {
            event.preventDefault()
            ;(event.shiftKey ? last : first)?.focus()
          }
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          if (!pending) onClose()
        }
      }}
      onCancel={(event) => {
        if (pending) event.preventDefault()
      }}
      onClose={(event) => {
        // StrictMode reopens after effect cleanup; its queued close is obsolete.
        if (!event.currentTarget.open) onClose()
      }}
    >
      {placement === 'start' ? (
        <button
          type="button"
          className="absolute start-auto end-3 top-4 z-1 grid size-11 place-items-center rounded-control border-0 bg-transparent p-0 text-slate-300 hover:bg-slate-800"
          aria-label="Tutup menu navigasi"
          disabled={pending}
          onClick={onClose}
        >
          <X size={24} aria-hidden="true" />
        </button>
      ) : (
        <header className="mb-6 flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[24px] leading-tight font-semibold wrap-anywhere"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border-0 border-border p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40"
            aria-label="Tutup dialog"
            disabled={pending}
            onClick={onClose}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>
      )}
      {placement === 'start' ? (
        children
      ) : (
        <div className="flex min-h-0 flex-col gap-5">{children}</div>
      )}
    </dialog>
  )
}

export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-7 -my-1 flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto overscroll-contain px-7 py-1 max-sm:-mx-5 max-sm:px-5">
      {children}
    </div>
  )
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 bg-surface pt-4 pb-1 [&>div]:flex [&>div]:flex-wrap [&>div]:gap-3 max-sm:[&>div]:flex-1 max-sm:[&>div]:justify-end">
      {children}
    </footer>
  )
}

export function ModalForm({
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'className' | 'style'>) {
  return (
    <form {...props} className="flex min-h-0 min-w-0 flex-col gap-5">
      {children}
    </form>
  )
}

type ModalActionVariant = 'secondary' | 'primary' | 'danger'

const actionStyles = {
  secondary: 'border-border bg-surface text-slate-700 enabled:hover:bg-page',
  primary:
    'border-transparent bg-action text-white enabled:hover:bg-action-hover forced-colors:border-[ButtonText]',
  danger:
    'border-danger bg-danger text-white enabled:hover:bg-red-800 forced-colors:border-[ButtonText]',
}

function actionClassName(variant: ModalActionVariant) {
  return cn(
    'inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere enabled:cursor-pointer disabled:cursor-wait disabled:opacity-65 aria-disabled:cursor-wait aria-disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0',
    actionStyles[variant],
  )
}

export function ModalButton({
  variant = 'secondary',
  type = 'button',
  ...props
}: Omit<ComponentProps<'button'>, 'className' | 'style'> & {
  variant?: ModalActionVariant
}) {
  return <button {...props} type={type} className={actionClassName(variant)} />
}

export function ModalLink({
  variant = 'primary',
  ...props
}: Omit<ComponentProps<typeof Link>, 'className' | 'style'> & {
  variant?: ModalActionVariant
}) {
  return <Link {...props} className={actionClassName(variant)} />
}
