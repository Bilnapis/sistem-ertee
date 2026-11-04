import { cn } from '../../lib/cn'
import {
  badge,
  buttons,
  dialogHeading,
  dialogSurface,
  formControl,
  iconButton,
  pageContent,
  surface,
} from '../../components/ui'

/** Static utilities shared by the directory, editor, and resident dialogs. */
const styles = {
  page: '@container/page w-full min-w-0 flex-1 text-sm leading-normal',
  pageContent: cn(
    pageContent,
    'px-6 pt-6 pb-8 @max-[33rem]/page:px-4 @max-[33rem]/page:pb-6',
  ),
  pageHeader:
    'flex flex-wrap items-center justify-between gap-4 [&>div]:min-w-0 [&>div]:flex-[1_1_18rem] [&>a]:min-h-11 [&>a]:flex-[0_1_auto] [&>a]:px-4 [&>a]:py-2.5 [&>a>span]:min-w-0 [&>a>span]:wrap-anywhere @max-[33rem]/page:[&>a]:basis-full',
  primary: buttons.primary,
  secondary: buttons.secondary,
  danger: buttons.danger,
  directory: 'flex min-w-0 flex-col gap-3',
  filters:
    'grid grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,10.5rem))] items-end gap-3 @max-[48.25rem]/page:grid-cols-3 @max-[33rem]/page:grid-cols-2',
  searchField: 'grid min-w-0 gap-1.5 @max-[48.25rem]/page:col-span-full',
  filterLabel: 'grid min-w-0 gap-1.5',
  sortField: '@max-[33rem]/page:col-span-full',
  filterTitle: 'text-sm leading-5 font-semibold text-slate-700 wrap-anywhere',
  search:
    'flex min-w-0 items-center gap-2 rounded-control border border-control-border bg-surface px-3 text-muted focus-within:border-action focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action [&>svg]:shrink-0 [&>input]:min-h-[46px] [&>input]:w-full [&>input]:min-w-0 [&>input]:border-0 [&>input]:bg-transparent [&>input]:py-2 [&>input]:text-base [&>input]:leading-6 [&>input]:text-ink [&>input]:outline-offset-[-3px] [&>input]:placeholder:text-muted',
  select: cn(formControl, 'pe-9'),
  tableBlock: 'grid min-w-0 gap-2',
  tableHint:
    'hidden items-center gap-2 text-xs leading-normal text-muted @max-[47.125rem]/page:flex [&>svg]:shrink-0 [&>span]:min-w-0 [&>span]:wrap-anywhere',
  tableScroll: cn(surface, 'overflow-auto overscroll-x-contain'),
  table:
    'w-full min-w-[44rem] table-fixed border-collapse text-sm leading-normal [&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:align-middle [&_th]:wrap-anywhere [&_td]:px-4 [&_td]:py-3 [&_td]:text-start [&_td]:align-middle [&_td]:wrap-anywhere [&_thead]:bg-soft [&_thead]:text-xs [&_thead]:tracking-wider [&_thead]:text-slate-600 [&_thead]:uppercase [&_thead_th]:font-bold [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_tbody_th]:font-semibold [&_th:last-child]:text-end [&_td:last-child]:text-end',
  nameColumn: 'w-[29%]',
  identityColumn: 'w-[23%]',
  genderColumn: 'w-[18%]',
  statusColumn: 'w-[18%]',
  actionColumn: 'w-[12%]',
  residentName: 'block wrap-anywhere',
  roleBadge:
    'mt-1 inline-block max-w-full rounded-md bg-soft px-2 py-0.5 text-xs leading-normal font-semibold text-slate-600 wrap-anywhere forced-colors:border forced-colors:border-current',
  identity: 'text-muted tabular-nums whitespace-nowrap',
  badge: cn(badge, 'w-fit whitespace-normal'),
  activeBadge: 'bg-success-soft text-success',
  mutedBadge: 'bg-soft text-slate-600',
  pendingBadge: 'bg-warning-soft text-warning',
  viewLink: cn(
    buttons.text,
    'justify-end font-semibold [&>span]:min-w-0 [&>span]:wrap-anywhere rtl:[&>svg]:-scale-x-100',
  ),
  pagination:
    'flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-1 text-sm leading-normal text-muted [&>p]:min-w-0 [&>p]:flex-[1_1_15rem] [&>p]:wrap-anywhere [&>nav]:ms-auto [&>nav]:flex [&>nav]:max-w-full [&>nav]:flex-wrap [&>nav]:items-center [&>nav]:justify-end [&>nav]:gap-2 [&>nav]:text-ink [&>nav]:tabular-nums',
  pageIndicator: 'min-w-0 px-1 wrap-anywhere',
  pageButton: cn(iconButton, 'rtl:[&>svg]:-scale-x-100'),
  close: cn(iconButton, 'border-0 bg-page'),
  empty:
    'flex flex-col items-center gap-4 px-5 py-10 text-center text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink',
  retry: 'flex flex-wrap gap-3',
  srOnly: 'sr-only',
  dialog: cn(
    dialogSurface,
    'fixed w-[min(1000px,calc(100%-2rem))] max-w-none backdrop:bg-ink/60 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100%-1.5rem)]',
  ),
  dialogHeader: dialogHeading,
  editor: 'flex flex-col gap-5',
  details: 'flex flex-col gap-5',
  formFields:
    'm-0 grid min-w-0 grid-cols-2 gap-4 border-0 p-0 max-sm:grid-cols-1 [&_input[readonly]]:text-muted',
  notice:
    'flex items-start gap-3 rounded-control bg-blue-50 p-4 text-sm leading-relaxed text-info [&>svg]:mt-0.5 [&>svg]:shrink-0',
  dialogActions:
    'sticky -bottom-7 z-1 flex items-center justify-between gap-3 bg-surface pt-4 pb-1 max-sm:-bottom-5 max-sm:flex-wrap [&>div]:flex [&>div]:flex-wrap [&>div]:gap-3 max-sm:[&>div]:flex-1 max-sm:[&>div]:justify-end',
  inlineActions: 'flex flex-wrap gap-3',
  textButton: cn(buttons.text, 'self-start'),
  profileSummary:
    'flex items-center gap-4 rounded-summary bg-page p-4 max-sm:flex-wrap max-sm:gap-3 [&>div]:min-w-0 [&>div]:flex-1 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:wrap-anywhere max-sm:[&_h3]:text-lg [&_p]:mt-1 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted',
  avatar:
    'grid size-16 shrink-0 place-items-center rounded-full bg-brand text-2xl font-extrabold text-white max-sm:size-12 max-sm:text-lg',
  detailGrid:
    'm-0 grid grid-cols-2 gap-x-4 gap-y-3 max-sm:grid-cols-1 [&>div]:min-w-0 [&>div]:rounded-summary [&>div]:border [&>div]:border-border [&>div]:p-3 [&_dt]:mb-3 [&_dt]:text-sm [&_dt]:font-semibold [&_dt]:text-slate-600 [&_dd]:m-0 [&_dd]:text-sm [&_dd]:leading-relaxed [&_dd]:font-bold [&_dd]:wrap-anywhere',
  verificationNote:
    'flex flex-col items-start gap-3 rounded-control bg-page p-4 text-sm leading-relaxed wrap-anywhere',
  managementActions: 'flex flex-wrap gap-3',
  confirmation:
    'flex flex-col gap-3 rounded-control border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed [&_h3]:text-base [&_h3]:font-bold',
  textarea: cn(formControl, 'min-h-25 resize-y'),
  history:
    'border-t border-border pt-5 text-sm leading-relaxed [&_h3]:mb-3 [&_h3]:text-base [&_h3]:font-bold [&_ol]:flex [&_ol]:max-h-75 [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-4 [&_ol]:overflow-auto [&_ol]:ps-5 [&_li_p]:text-muted [&_li_p]:wrap-anywhere',
}

export default styles
