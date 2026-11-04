import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { residentError, useResident } from './data'
import { ResidentModal } from './ResidentModal'
import { ResidentEditor } from './ResidentEditor'
import { ResidentDetails } from './ResidentDetails'
import styles from './styles'

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
        <p className={styles.empty} role="status">
          Memuat data warga…
        </p>
      ) : mode !== 'create' && resident.isError ? (
        <div className={styles.empty}>
          <Feedback>{residentError(resident.error)}</Feedback>
          <button
            type="button"
            className={styles.secondary}
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
