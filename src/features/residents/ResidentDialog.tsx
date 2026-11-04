import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { residentError, useResident } from './data'
import { ResidentModal } from './ResidentModal'
import { ResidentEditor } from './ResidentEditor'
import { ResidentDetails } from './ResidentDetails'

export default function ResidentDialog({
  mode,
}: {
  mode: 'create' | 'view' | 'edit'
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const resident = useResident(mode === 'create' ? undefined : id)
  const close = () =>
    navigate({ pathname: '/admin/warga', search: location.search })
  const titles = {
    create: 'Tambah Warga Baru',
    view: 'Detail Warga',
    edit: 'Edit Data Warga',
  }
  return (
    <ResidentModal
      title={titles[mode]}
      description={
        mode === 'view'
          ? 'Informasi lengkap warga yang terdaftar'
          : mode === 'edit'
            ? 'Perbarui informasi warga yang terdaftar'
            : 'Lengkapi data warga dan buat akun login'
      }
      onClose={close}
      pending={pending}
    >
      {mode !== 'create' && resident.isPending ? (
        <p
          className="flex flex-col items-center gap-4 px-5 py-10 text-center text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink"
          role="status"
        >
          Memuat data warga…
        </p>
      ) : mode !== 'create' && resident.isError ? (
        <div className="flex flex-col items-center gap-4 px-5 py-10 text-center text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
          <Feedback>{residentError(resident.error)}</Feedback>
          <button
            type="button"
            className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
            onClick={() => void resident.refetch()}
          >
            Coba lagi data warga
          </button>
        </div>
      ) : mode === 'view' && resident.data ? (
        <ResidentDetails
          key={id}
          profile={resident.data}
          onClose={close}
          onPending={setPending}
        />
      ) : mode === 'edit' && resident.data?.archived_at ? (
        <Feedback>
          Pulihkan arsip terlebih dahulu sebelum mengubah data warga.
        </Feedback>
      ) : (
        <ResidentEditor
          key={`${mode}:${id ?? 'new'}`}
          profile={resident.data ?? undefined}
          manageAccess
          onPending={setPending}
          onCancel={close}
          onSaved={(residentId) =>
            navigate({
              pathname: `/admin/warga/${residentId}`,
              search: location.search,
            })
          }
        />
      )}
    </ResidentModal>
  )
}
