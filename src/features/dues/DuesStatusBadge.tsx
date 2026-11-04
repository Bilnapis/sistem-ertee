import { duesStatuses } from './data'
import type { DuesStatus } from './types'

export function DuesStatusBadge({ status }: { status: DuesStatus }) {
  return (
    <span
      className="inline-flex min-h-8 max-w-full items-center justify-center rounded-full bg-danger-soft px-3 py-1 text-center text-xs leading-normal font-semibold wrap-anywhere text-danger data-[status=lunas]:bg-success-soft data-[status=lunas]:text-success data-[status=menunggu_verifikasi]:bg-warning-soft data-[status=menunggu_verifikasi]:text-warning forced-colors:border forced-colors:border-[CanvasText]"
      data-status={status}
    >
      {duesStatuses[status]}
    </span>
  )
}
