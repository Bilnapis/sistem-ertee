import type { LetterStatus } from '../../lib/database.types'
import { letterStatuses } from './data'
import styles from './styles'

export function LetterStatusBadge({ status }: { status: LetterStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      {letterStatuses[status]}
    </span>
  )
}
