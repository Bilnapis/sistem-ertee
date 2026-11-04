import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './styles'

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
      className={styles.dialog}
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
      <header className={styles.dialogHeader}>
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <button
          type="button"
          className={styles.close}
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
