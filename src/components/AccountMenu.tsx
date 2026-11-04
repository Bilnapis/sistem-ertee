import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, UserRoundPen } from 'lucide-react'
import { SignOutButton } from '../features/auth/SignOutButton'
import { ResidentEditor } from '../features/residents/ResidentEditor'
import { ResidentModal } from '../features/residents/ResidentModal'
import { initials, roleLabels } from '../features/residents/data'
import type { ResidentProfile } from '../lib/database.types'
import styles from './AccountMenu.module.css'

export function AccountMenu({ profile }: { profile: ResidentProfile }) {
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const dropdown = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const role = roleLabels[profile.role]

  useLayoutEffect(() => {
    if (!open) return
    const node = menu.current!
    const popup = dropdown.current!
    const updateBounds = () => {
      const available =
        window.innerHeight - popup.getBoundingClientRect().top - 16
      popup.style.setProperty(
        '--account-menu-max-height',
        `${Math.max(0, available)}px`,
      )
    }
    updateBounds()
    const observer = new ResizeObserver(updateBounds)
    observer.observe(node)
    window.addEventListener('resize', updateBounds)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateBounds)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      const node = menu.current
      if (
        node &&
        event.target instanceof Node &&
        !node.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  function closeEditor() {
    setEditing(false)
    window.requestAnimationFrame(() => trigger.current?.focus())
  }

  return (
    <>
      <div
        ref={menu}
        className={styles.accountMenu}
        onBlur={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setOpen(false)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            trigger.current?.focus()
          }
        }}
      >
        <button
          ref={trigger}
          type="button"
          className={styles.trigger}
          aria-label={`Menu akun ${profile.full_name}, ${role}`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className={styles.avatar} aria-hidden="true">
            {initials(profile.full_name)}
          </span>
          <span className={styles.accountDetails}>
            <span className={styles.name}>{profile.full_name}</span>
            <span className={styles.role}>{role}</span>
          </span>
          <ChevronDown
            size={16}
            className={styles.chevron}
            aria-hidden="true"
          />
        </button>
        <div
          ref={dropdown}
          id={menuId}
          className={styles.dropdown}
          hidden={!open}
          role="group"
          aria-label="Tindakan akun"
        >
          <div className={styles.identity}>
            <strong>{profile.full_name}</strong>
            <span>{profile.email}</span>
          </div>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setOpen(false)
              trigger.current?.focus()
              setEditing(true)
            }}
          >
            <UserRoundPen size={18} aria-hidden="true" />
            Ubah data diri
          </button>
          <SignOutButton className={styles.menuItem} />
        </div>
      </div>
      {editing ? (
        <ResidentModal
          title="Edit Profil Saya"
          description="Perubahan identitas akan diperiksa ulang oleh pengurus RT."
          onClose={closeEditor}
          pending={pending}
        >
          <ResidentEditor
            profile={profile}
            onPending={setPending}
            onCancel={closeEditor}
            onSaved={closeEditor}
          />
        </ResidentModal>
      ) : null}
    </>
  )
}
