import { TableBadge } from '../../components/TablePagination'
import { complaintStatuses } from './data'
import type { ComplaintStatus } from './types'

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <TableBadge
      tone={
        status === 'selesai'
          ? 'success'
          : status === 'ditolak'
            ? 'danger'
            : status === 'diproses'
              ? 'info'
              : 'warning'
      }
    >
      {complaintStatuses[status]}
    </TableBadge>
  )
}
