import { cn } from '../../lib/cn'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function AnnouncementModal({
  title,
  description,
  children,
  onClose,
  pending = false,
  kind = 'detail',
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  pending?: boolean
  kind?: 'form' | 'confirm' | 'detail'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const node = ref.current!
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
      ref={ref}
      className={cn(
        'm-auto max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] overflow-y-auto overscroll-contain rounded-dialog border-0 bg-surface p-7 text-ink shadow-dialog backdrop:bg-ink/50 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100%-1.5rem)] max-sm:p-5',
        kind === 'form'
          ? 'max-w-[1000px]'
          : kind === 'confirm'
            ? 'max-w-[528px]'
            : 'max-w-[912px]',
      )}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      closedby={pending ? 'none' : 'any'}
      onKeyDown={(event) => {
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
        if (!event.currentTarget.open) onClose()
      }}
    >
      <header className="mb-6 flex items-start justify-between gap-4 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:font-bold [&_h2]:wrap-anywhere max-sm:[&_h2]:text-2xl [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-muted [&>div]:min-w-0">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border-0 border-border bg-page p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40"
          aria-label={`Tutup ${title.toLocaleLowerCase('id-ID')}`}
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
