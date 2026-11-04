import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function DuesModal({
  title,
  children,
  onClose,
  pending = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  pending?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId()
  useEffect(() => {
    const node = ref.current!,
      previous = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[648px] overflow-y-auto overscroll-contain rounded-dialog border-0 bg-surface p-7 text-ink shadow-dialog backdrop:bg-ink/50 max-sm:p-5 [&_form>*+*]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&>*+*]:mt-5"
      aria-labelledby={titleId}
      closedby={pending ? 'none' : 'any'}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((node) => node.getClientRects().length > 0)
          const first = controls[0],
            last = controls.at(-1)
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
      onClose={() => {
        if (!ref.current?.open) onClose()
      }}
    >
      <header className="mb-0 flex items-center justify-between gap-3 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:font-bold [&_h2]:wrap-anywhere max-sm:[&_h2]:text-2xl [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-muted [&>div]:min-w-0">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border-0 border-border bg-page p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40"
          aria-label="Tutup dialog"
          disabled={pending}
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  )
}
