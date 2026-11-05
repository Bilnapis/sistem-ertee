import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/cn'

export type ButtonStyleProps = {
  className?: never
  style?: never
  variant?: 'solid' | 'outline' | 'ghost' | 'danger'
  size?: 'default' | 'compact' | 'text' | 'icon'
  width?: 'auto' | 'full' | 'responsive'
  align?: 'center' | 'start' | 'between'
  tone?: 'default' | 'inverse'
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  mirrorIcons?: boolean
  children?: ReactNode
}

export type ButtonProps = Omit<
  ComponentProps<'button'>,
  'className' | 'style' | 'children'
> &
  ButtonStyleProps

export type ButtonLinkProps = Omit<
  ComponentProps<typeof Link>,
  'className' | 'style' | 'children'
> &
  ButtonStyleProps & { disabled?: boolean }

function buttonClassName({
  variant = 'solid',
  size = 'default',
  width = 'auto',
  align = 'center',
  tone = 'default',
}: ButtonStyleProps) {
  return cn(
    'group/button inline-flex max-w-full min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-control border font-sans text-sm leading-5 font-bold wrap-anywhere focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-65 aria-disabled:cursor-wait aria-disabled:opacity-65 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] forced-colors:disabled:border-[GrayText] forced-colors:disabled:text-[GrayText] forced-colors:aria-disabled:border-[GrayText] forced-colors:aria-disabled:text-[GrayText]',
    variant === 'solid' &&
      'border-transparent bg-action text-white enabled:hover:bg-action-hover [&:is(a):not([aria-disabled=true])]:hover:bg-action-hover',
    variant === 'outline' &&
      'border-border bg-surface text-slate-700 enabled:hover:bg-page [&:is(a):not([aria-disabled=true])]:hover:bg-page',
    variant === 'ghost' &&
      'border-transparent bg-transparent text-action aria-expanded:bg-focus-soft',
    variant === 'danger' &&
      'border-danger bg-danger text-white enabled:hover:bg-red-800 [&:is(a):not([aria-disabled=true])]:hover:bg-red-800',
    tone === 'inverse' &&
      variant === 'ghost' &&
      'text-slate-300 enabled:hover:bg-slate-800 enabled:hover:text-white [&:is(a):not([aria-disabled=true])]:hover:bg-slate-800 [&:is(a):not([aria-disabled=true])]:hover:text-white',
    size === 'default' && 'min-h-12 px-5 py-3',
    size === 'compact' && 'min-h-11 px-4 py-2.5',
    size === 'text' && 'min-h-11 px-0 py-2',
    size === 'icon' && 'size-11 p-0',
    width === 'auto' && size !== 'icon' && 'w-fit',
    width === 'full' && 'w-full',
    width === 'responsive' && 'w-fit @max-[33rem]/page:w-full',
    align === 'center' && 'justify-center text-center',
    align === 'start' && 'justify-start text-start',
    align === 'between' && 'justify-between text-start',
  )
}

function ButtonContent({
  children,
  leadingIcon,
  trailingIcon,
  size,
  align,
  mirrorIcons,
}: ButtonStyleProps) {
  const iconClassName = cn(
    'inline-flex shrink-0 items-center justify-center [&>svg]:size-[1.125rem]',
    size === 'icon' && '[&>svg]:size-5',
    mirrorIcons && 'rtl:-scale-x-100',
  )
  return (
    <>
      {leadingIcon ? (
        <span className={iconClassName} aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      {children !== undefined && children !== null ? (
        <span
          className={cn(
            'min-w-0 wrap-anywhere',
            (align === 'start' || align === 'between') && 'flex-1',
          )}
        >
          {children}
        </span>
      ) : null}
      {trailingIcon ? (
        <span
          className={cn(iconClassName, 'group-aria-expanded/button:rotate-180')}
          aria-hidden="true"
        >
          {trailingIcon}
        </span>
      ) : null}
    </>
  )
}

export function Button({
  variant,
  size,
  width,
  align,
  tone,
  leadingIcon,
  trailingIcon,
  mirrorIcons,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const appearance = { variant, size, width, align, tone }
  return (
    <button {...props} type={type} className={buttonClassName(appearance)}>
      <ButtonContent
        {...appearance}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        mirrorIcons={mirrorIcons}
      >
        {children}
      </ButtonContent>
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  width,
  align,
  tone,
  leadingIcon,
  trailingIcon,
  mirrorIcons,
  children,
  disabled = false,
  onClick,
  onAuxClick,
  onContextMenu,
  tabIndex,
  ...props
}: ButtonLinkProps) {
  const appearance = { variant, size, width, align, tone }
  const isDisabled =
    disabled ||
    props['aria-disabled'] === true ||
    props['aria-disabled'] === 'true'
  return (
    <Link
      {...props}
      className={buttonClassName(appearance)}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : tabIndex}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onClick?.(event)
      }}
      onAuxClick={(event) => {
        if (isDisabled) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onAuxClick?.(event)
      }}
      onContextMenu={(event) => {
        if (isDisabled) {
          event.preventDefault()
          return
        }
        onContextMenu?.(event)
      }}
    >
      <ButtonContent
        {...appearance}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        mirrorIcons={mirrorIcons}
      >
        {children}
      </ButtonContent>
    </Link>
  )
}
