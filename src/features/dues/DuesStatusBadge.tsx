import { duesStatuses } from './data'
import type { DuesStatus } from './types'
import styles from './Dues.module.css'
export function DuesStatusBadge({ status }: { status: DuesStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      {duesStatuses[status]}
    </span>
  )
}
