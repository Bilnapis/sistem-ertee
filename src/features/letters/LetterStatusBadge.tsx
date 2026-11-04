import type { LetterStatus } from '../../lib/database.types'
import { letterStatuses } from './data'

export function LetterStatusBadge({ status }: { status: LetterStatus }) {
  return (
    <span
      className="inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs leading-normal font-semibold wrap-anywhere whitespace-nowrap data-[status=diproses]:bg-info-soft data-[status=diproses]:text-info data-[status=pengajuan]:bg-warning-soft data-[status=pengajuan]:text-warning data-[status=selesai]:bg-success-soft data-[status=selesai]:text-success forced-colors:border forced-colors:border-[CanvasText]"
      data-status={status}
    >
      {letterStatuses[status]}
    </span>
  )
}
