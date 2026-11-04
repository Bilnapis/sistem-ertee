import { cn } from '../../lib/cn'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './styles'

export function LetterModal({
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
  kind?: 'form' | 'picker' | 'detail'
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
      className={cn(styles.dialog, styles[kind])}
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
      <header className={styles.dialogHeader}>
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <button
          type="button"
          className={styles.close}
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
