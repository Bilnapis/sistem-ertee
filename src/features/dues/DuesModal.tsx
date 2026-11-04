import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Dues.module.css'

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
      className={styles.dialog}
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
      <header className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className={styles.close}
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
