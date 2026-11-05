import { useId } from 'react'
import type { Key, ReactNode } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { LinkProps } from 'react-router'
import { Button, ButtonLink } from './Button'
import { cn } from '../lib/cn'
import { Feedback } from './Feedback'

export type TablePaginationColumn<T> = {
  id: string
  header: string
  width: number
  rowHeader?: boolean
  kind?: 'text' | 'identity' | 'number'
  render: (item: T, index: number) => ReactNode
}

export type TablePaginationProps<T> = {
  caption: string
  toolbar?: ReactNode
  columns: readonly TablePaginationColumn<T>[]
  items: readonly T[]
  getRowKey: (item: T) => Key
  pagination: {
    page: number
    pageSize: number
    total: number
    itemLabel: string
    label: string
    onPageChange: (page: number) => void
  }
  isFetching?: boolean
  isLoading?: boolean
  loadingMessage?: string
  error?: string | null
  onRetry?: () => void
  retryLabel?: string
  emptyState: {
    icon?: LucideIcon
    title?: string
    description: string
    action?: { label: string; onClick: () => void }
  }
}

export function TablePagination<T>({
  caption,
  toolbar,
  columns,
  items,
  getRowKey,
  pagination,
  isFetching = false,
  isLoading = false,
  loadingMessage = 'Memuat data…',
  error,
  onRetry,
  retryLabel = 'Coba lagi',
  emptyState,
}: TablePaginationProps<T>) {
  const hintId = useId()
  const { page, pageSize, total, itemLabel, label, onPageChange } = pagination
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = items.length ? (page - 1) * pageSize + 1 : 0
  const end = items.length ? Math.min(start + items.length - 1, total) : 0
  const EmptyIcon = emptyState.icon

  return (
    <div
      className={cn(
        '@container/table-pagination grid min-w-0 gap-2 font-sans text-sm leading-normal font-normal text-ink',
        toolbar && 'gap-5 rounded-lg border border-border bg-surface p-4',
      )}
    >
      {toolbar}
      {isLoading || error || !items.length ? (
        <div className="flex min-w-0 flex-col items-center gap-4 px-5 py-10 text-center wrap-anywhere text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
          {isLoading ? (
            <p role="status">{loadingMessage}</p>
          ) : error ? (
            <>
              <Feedback>{error}</Feedback>
              {onRetry ? (
                <Button
                  type="button"
                  onClick={onRetry}
                  disabled={isFetching}
                  variant="outline"
                >
                  {retryLabel}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              {EmptyIcon ? <EmptyIcon size={32} aria-hidden="true" /> : null}
              {emptyState.title ? <h2>{emptyState.title}</h2> : null}
              <p>{emptyState.description}</p>
              {emptyState.action ? (
                <Button
                  type="button"
                  onClick={emptyState.action.onClick}
                  disabled={isFetching}
                  variant="outline"
                >
                  {emptyState.action.label}
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <>
          <p
            className={cn(
              'hidden items-center gap-2 text-xs leading-normal text-muted [&>span]:min-w-0 [&>span]:wrap-anywhere [&>svg]:shrink-0',
              columns.length <= 5
                ? '@max-[44rem]/table-pagination:flex'
                : columns.length === 6
                  ? '@max-[52rem]/table-pagination:flex'
                  : '@max-[60rem]/table-pagination:flex',
            )}
            id={hintId}
          >
            <MoveHorizontal size={16} aria-hidden="true" />
            <span>Geser tabel untuk melihat kolom lainnya</span>
          </p>
          <div
            className="min-w-0 overflow-auto overscroll-x-contain rounded-lg border border-border bg-surface"
            role="region"
            aria-label={`${caption}, geser untuk melihat seluruh kolom`}
            aria-describedby={hintId}
            tabIndex={0}
            aria-busy={isFetching}
          >
            <table
              className={cn(
                'w-full table-fixed border-collapse text-sm leading-normal [&_tbody_th]:font-semibold [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:text-start [&_td]:align-middle [&_td]:wrap-anywhere [&_td:last-child]:text-end [&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:align-middle [&_th]:wrap-anywhere [&_th:last-child]:text-end [&_thead]:bg-soft [&_thead]:text-sm [&_thead]:text-slate-600 [&_thead_th]:font-semibold [&_time]:text-muted [&_time]:tabular-nums',
                columns.length <= 5
                  ? 'min-w-[44rem]'
                  : columns.length === 6
                    ? 'min-w-[52rem]'
                    : 'min-w-[60rem]',
              )}
            >
              <caption className="sr-only">{caption}</caption>
              <colgroup>
                {columns.map((column) => (
                  <col key={column.id} style={{ width: `${column.width}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.id} scope="col">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={getRowKey(item)}>
                    {columns.map((column) => {
                      const Cell = column.rowHeader ? 'th' : 'td'
                      return (
                        <Cell
                          key={column.id}
                          scope={column.rowHeader ? 'row' : undefined}
                          className={cn(
                            column.kind === 'identity' &&
                              'whitespace-nowrap text-muted tabular-nums',
                            column.kind === 'number' && 'tabular-nums',
                          )}
                        >
                          {column.render(item, index)}
                        </Cell>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!isLoading && !error ? (
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-1 text-sm leading-normal text-muted [&>nav]:ms-auto [&>nav]:flex [&>nav]:max-w-full [&>nav]:flex-wrap [&>nav]:items-center [&>nav]:justify-end [&>nav]:gap-2 [&>nav]:text-ink [&>nav]:tabular-nums [&>p]:min-w-0 [&>p]:flex-[1_1_15rem] [&>p]:wrap-anywhere">
          <p aria-live="polite" aria-atomic="true">
            Menampilkan {start.toLocaleString('id-ID')}–
            {end.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')}{' '}
            {itemLabel}
          </p>
          <nav aria-label={label}>
            <Button
              type="button"
              disabled={page <= 1 || isFetching}
              aria-label="Halaman sebelumnya"
              onClick={() => onPageChange(page - 1)}
              variant="outline"
              leadingIcon={<ChevronLeft size={18} aria-hidden="true" />}
              size="icon"
              mirrorIcons
            />
            <span className="min-w-0 px-1 wrap-anywhere" aria-current="page">
              <bdi>
                {page.toLocaleString('id-ID')} /{' '}
                {pageCount.toLocaleString('id-ID')}
              </bdi>
            </span>
            <Button
              type="button"
              disabled={page >= pageCount || isFetching || !total}
              aria-label="Halaman berikutnya"
              onClick={() => onPageChange(page + 1)}
              variant="outline"
              leadingIcon={<ChevronRight size={18} aria-hidden="true" />}
              size="icon"
              mirrorIcons
            />
          </nav>
        </footer>
      ) : null}
    </div>
  )
}

export function TableCellText({
  children,
  secondary,
  tag,
}: {
  children: ReactNode
  secondary?: string
  tag?: string
}) {
  return (
    <>
      <span className="block wrap-anywhere">
        <bdi>{children}</bdi>
      </span>
      {secondary ? (
        <span className="mt-1 block text-sm font-normal text-muted">
          <bdi>{secondary}</bdi>
        </span>
      ) : null}
      {tag ? (
        <span className="mt-1 inline-block max-w-full rounded-md bg-soft px-2 py-0.5 text-sm leading-normal font-semibold wrap-anywhere text-slate-600 forced-colors:border forced-colors:border-current">
          {tag}
        </span>
      ) : null}
    </>
  )
}

export function TableBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'info' | 'danger'
}) {
  return (
    <span
      className="inline-flex w-fit max-w-full items-center rounded-full bg-soft px-3 py-1 text-sm leading-normal font-semibold wrap-anywhere whitespace-normal text-slate-600 data-[tone=danger]:bg-danger-soft data-[tone=danger]:text-danger data-[tone=info]:bg-info-soft data-[tone=info]:text-info data-[tone=success]:bg-success-soft data-[tone=success]:text-success data-[tone=warning]:bg-warning-soft data-[tone=warning]:text-warning forced-colors:border forced-colors:border-[CanvasText]"
      data-tone={tone}
    >
      {children}
    </span>
  )
}

export function TableActionLink({
  children,
  to,
  'aria-label': label,
}: Pick<LinkProps, 'children' | 'to' | 'aria-label'>) {
  return (
    <ButtonLink
      to={to}
      aria-label={label}
      variant="ghost"
      trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
      size="text"
      align="start"
      mirrorIcons
    >
      <span>{children}</span>
    </ButtonLink>
  )
}
