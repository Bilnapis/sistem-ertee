import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function ResidentModal({
  title,
  description,
  children,
  onClose,
  pending = false,
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  pending?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const node = dialog.current!
    node.showModal()
    return () => node.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="fixed m-auto max-h-[calc(100dvh-2rem)] w-[min(1000px,calc(100%-2rem))] max-w-none overflow-y-auto overscroll-contain rounded-dialog border-0 bg-surface p-7 text-ink shadow-dialog backdrop:bg-ink/60 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100%-1.5rem)] max-sm:p-5"
      aria-labelledby={titleId}
      closedby={pending ? 'none' : 'any'}
      onCancel={(event) => {
        if (pending) event.preventDefault()
      }}
      onClose={(event) => {
        // StrictMode reopens after effect cleanup; its queued close is obsolete.
        if (!event.currentTarget.open) onClose()
      }}
    >
      <header className="mb-6 flex items-start justify-between gap-4 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:font-bold [&_h2]:wrap-anywhere max-sm:[&_h2]:text-2xl [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-muted [&>div]:min-w-0">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border-0 border-border bg-page p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40"
          aria-label="Tutup dialog"
          disabled={pending}
          onClick={onClose}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  )
}
