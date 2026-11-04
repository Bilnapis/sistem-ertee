import { cn } from '../lib/cn'

const buttonBase =
  'inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere enabled:cursor-pointer disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0 motion-safe:transition-colors motion-safe:duration-150'

export const buttons = {
  primary: cn(
    buttonBase,
    'border-transparent bg-action text-white enabled:hover:bg-action-hover forced-colors:border-[ButtonText]',
  ),
  secondary: cn(
    buttonBase,
    'border-border bg-surface text-slate-700 enabled:hover:bg-page',
  ),
  danger: cn(
    buttonBase,
    'border-danger bg-danger text-white enabled:hover:bg-red-800 forced-colors:border-[ButtonText]',
  ),
  text: 'inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold text-action wrap-anywhere hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0',
}

export const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40'

export const field = cn(
  'flex min-w-0 flex-col gap-1.5',
  '[&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700',
)

export const formControl =
  'min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 text-start font-sans text-base leading-6 text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100'

export const selectControl = cn(formControl, 'pe-8 text-ellipsis')
export const textareaControl = cn(formControl, 'min-h-24 resize-y')

export const surface = 'rounded-card border border-border bg-surface'
export const dialogSurface =
  'm-auto max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-dialog border-0 bg-surface p-7 text-ink shadow-dialog backdrop:bg-ink/50 max-sm:p-5'
export const dialogHeading =
  'mb-6 flex items-start justify-between gap-4 [&>div]:min-w-0 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:font-bold [&_h2]:wrap-anywhere [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-muted max-sm:[&_h2]:text-2xl'
export const pageContent =
  'mx-auto flex w-full min-w-0 max-w-[96rem] flex-col gap-6'
export const badge =
  'inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs leading-normal font-semibold wrap-anywhere forced-colors:border forced-colors:border-[CanvasText]'
