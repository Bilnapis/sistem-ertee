import { useEffect, useId, useRef } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
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
        <div className="absolute end-3 top-4 z-1">
          <Button
            type="button"
            aria-label="Tutup menu navigasi"
            disabled={pending}
            onClick={onClose}
            variant="ghost"
            tone="inverse"
            leadingIcon={<X size={24} aria-hidden="true" />}
            size="icon"
          />
        </div>
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
          <Button
            type="button"
            aria-label="Tutup dialog"
            disabled={pending}
            onClick={onClose}
            variant="ghost"
            leadingIcon={<X size={22} aria-hidden="true" />}
            size="icon"
          />
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
