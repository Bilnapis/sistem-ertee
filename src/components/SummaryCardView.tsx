import type { ComponentProps, ReactNode } from 'react'
import styles from './SummaryCardView.module.css'

export type SummaryCardViewItem = {
  id: string
  label: ReactNode
  value: number | string
}

export type SummaryCardViewProps = Pick<
  ComponentProps<'dl'>,
  'aria-label' | 'aria-busy'
> & {
  items: readonly SummaryCardViewItem[]
  columns?: 2 | 4
}

export function SummaryCardView({
  items,
  columns = 4,
  'aria-label': label,
  'aria-busy': busy,
}: SummaryCardViewProps) {
  return (
    <dl
      className={styles.view}
      data-columns={columns}
      aria-label={label}
      aria-busy={busy}
    >
      {items.map(({ id, label, value }) => (
        <div
          key={id}
          className={styles.card}
          data-value-type={typeof value === 'number' ? 'number' : 'text'}
        >
          <dt className={styles.label}>{label}</dt>
          <dd className={styles.value}>
            <bdi>
              {typeof value === 'number'
                ? value.toLocaleString('id-ID')
                : value}
            </bdi>
          </dd>
        </div>
      ))}
    </dl>
  )
}
