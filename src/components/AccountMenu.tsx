import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, UserRoundPen } from 'lucide-react'
import { SignOutButton } from '../features/auth/SignOutButton'
import { ResidentEditor } from '../features/residents/ResidentEditor'
import { ResidentModal } from '../features/residents/ResidentModal'
import { initials, roleLabels } from '../features/residents/data'
import type { ResidentProfile } from '../lib/database.types'

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
        className="relative max-w-80 min-w-0"
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
          className="group/account flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-3 rounded-control border border-transparent bg-surface px-2 py-1.5 text-start text-ink hover:border-border hover:bg-soft aria-expanded:border-border aria-expanded:bg-soft @max-[33rem]/authenticated-content:gap-2"
          aria-label={`Menu akun ${profile.full_name}, ${role}`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-focus-soft text-xs leading-none font-bold text-action @max-[33rem]/authenticated-content:size-8"
            aria-hidden="true"
          >
            {initials(profile.full_name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="max-w-[20ch] truncate text-sm leading-normal font-semibold">
              {profile.full_name}
            </span>
            <span className="text-xs leading-normal wrap-anywhere text-muted">
              {role}
            </span>
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 text-muted group-aria-expanded/account:rotate-180"
            aria-hidden="true"
          />
        </button>
        <div
          ref={dropdown}
          id={menuId}
          className="hidden:hidden absolute end-0 top-[calc(100%+0.5rem)] z-10 flex max-h-[var(--account-menu-max-height,calc(100dvh-8rem))] w-72 max-w-[calc(100vi-2rem)] flex-col gap-1 overflow-y-auto overscroll-contain rounded-control border border-border bg-surface p-2 text-ink shadow-[0_8px_24px_#0f172a14] [&>div]:min-w-0"
          hidden={!open}
          role="group"
          aria-label="Tindakan akun"
        >
          <div className="mb-1 flex min-w-0 flex-col gap-1 p-3 wrap-anywhere [&>span]:text-xs [&>span]:leading-normal [&>span]:text-muted [&>strong]:text-sm [&>strong]:leading-normal [&>strong]:font-semibold">
            <strong>{profile.full_name}</strong>
            <span>{profile.email}</span>
          </div>
          <button
            type="button"
            className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-start text-sm leading-normal font-medium wrap-anywhere text-ink hover:bg-soft [&>svg]:shrink-0 [&>svg]:text-muted"
            onClick={() => {
              setOpen(false)
              trigger.current?.focus()
              setEditing(true)
            }}
          >
            <UserRoundPen size={18} aria-hidden="true" />
            Ubah data diri
          </button>
          <SignOutButton className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-start text-sm leading-normal font-medium wrap-anywhere text-ink hover:bg-soft [&>svg]:shrink-0 [&>svg]:text-muted" />
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
