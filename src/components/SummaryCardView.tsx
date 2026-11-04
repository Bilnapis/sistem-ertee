import type { ComponentProps, ReactNode } from 'react'

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
      className="m-0 grid min-w-0 grid-cols-4 gap-3 font-sans data-[columns=2]:grid-cols-2 @max-[46rem]/page:grid-cols-2 @max-[20rem]/page:grid-cols-1 @max-[20rem]/page:data-[columns]:grid-cols-1"
      data-columns={columns}
      aria-label={label}
      aria-busy={busy}
    >
      {items.map(({ id, label, value }) => (
        <div
          key={id}
          className="grid min-w-0 grid-rows-[1fr_auto] items-start gap-1 rounded-summary border border-border bg-surface p-4 text-start text-sm leading-normal font-normal wrap-anywhere text-ink @max-[46rem]/page:data-[value-type=number]:grid-cols-[minmax(0,1fr)_fit-content(45%)] @max-[46rem]/page:data-[value-type=number]:grid-rows-[auto] @max-[46rem]/page:data-[value-type=number]:items-center @max-[46rem]/page:data-[value-type=number]:gap-2 @max-[33rem]/page:p-3 forced-colors:border-[CanvasText]"
          data-value-type={typeof value === 'number' ? 'number' : 'text'}
        >
          <dt className="m-0 min-w-0 [&_a]:text-inherit [&_a]:underline [&_a]:underline-offset-3">
            {label}
          </dt>
          <dd className="m-0 min-w-0 text-2xl leading-tight font-bold text-inherit tabular-nums">
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
