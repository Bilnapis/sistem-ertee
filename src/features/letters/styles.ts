import { cn } from '../../lib/cn'
import {
  badge,
  buttons,
  dialogHeading,
  dialogSurface,
  field,
  formControl,
  iconButton,
  pageContent,
  surface,
} from '../../components/ui'

/** Shared Tailwind variants keep personal and administrative letter views aligned. */
const styles = {
  page: '@container/page min-w-0 flex-1 p-6 max-sm:px-4',
  pageContent,
  pageHeader:
    'flex items-center justify-between gap-4 [&>a]:shrink-0 @max-[600px]/page:flex-col @max-[600px]/page:items-start',
  primary: buttons.primary,
  secondary: buttons.secondary,
  textLink: buttons.text,
  viewLink: buttons.text,
  eligibility:
    'rounded-summary border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-warning',
  list: 'flex min-w-0 flex-col gap-4',
  filters:
    'grid grid-cols-[minmax(200px,1fr)_minmax(130px,0.3fr)_minmax(150px,0.4fr)_minmax(120px,0.25fr)] items-start gap-3 has-[>:nth-child(3):last-child]:grid-cols-[minmax(200px,1fr)_minmax(130px,0.3fr)_minmax(120px,0.25fr)] @max-[1000px]/page:grid-cols-3 @max-[1000px]/page:[&>:first-child]:col-span-full @max-[1000px]/page:has-[>:nth-child(3):last-child]:grid-cols-2 @max-[600px]/page:grid-cols-2 @max-[600px]/page:[&>div:has(select)]:col-span-full',
  field,
  selectTrigger: cn(
    formControl,
    'flex items-center justify-between gap-3 [&>svg]:shrink-0 [&>svg]:text-muted',
  ),
  scrollHint:
    'hidden items-center gap-2 text-xs text-muted @max-[1000px]/page:flex',
  tableRegion: cn(surface, 'overflow-x-auto overscroll-x-contain'),
  table:
    'w-full min-w-[760px] border-collapse text-start text-sm leading-normal [&_thead]:bg-soft [&_thead]:text-muted [&_th]:border-b [&_th]:border-border [&_th]:px-6 [&_th]:py-5 [&_th]:text-start [&_td]:border-b [&_td]:border-border [&_td]:px-6 [&_td]:py-5 [&_td]:text-start [&_thead_th]:py-3 [&_thead_th]:text-xs [&_thead_th]:font-bold [&_thead_th]:whitespace-nowrap [&_tbody_th]:min-w-[170px] [&_tbody_th]:font-bold [&_tbody_tr:last-child>*]:border-b-0 [&_td]:text-slate-700 [&_td_time]:text-muted [&_td_time]:tabular-nums [&_td_time]:whitespace-nowrap [&_td:last-child]:whitespace-nowrap',
  badge: cn(
    badge,
    'whitespace-nowrap data-[status=diproses]:bg-info-soft data-[status=diproses]:text-info data-[status=pengajuan]:bg-warning-soft data-[status=pengajuan]:text-warning data-[status=selesai]:bg-success-soft data-[status=selesai]:text-success',
  ),
  pagination:
    'flex flex-wrap items-center justify-between gap-4 text-sm leading-normal text-muted [&>nav]:flex [&>nav]:shrink-0 [&>nav]:items-center [&>nav]:gap-2 [&>nav]:font-bold [&>nav]:text-ink [&>nav]:tabular-nums @max-[600px]/page:flex-col @max-[600px]/page:items-start @max-[600px]/page:[&>nav]:self-end',
  pageButton: iconButton,
  empty: cn(
    surface,
    'flex flex-col items-center gap-3 px-5 py-12 text-center leading-normal text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink',
  ),
  blocked: 'flex flex-col gap-4 py-3 [&>button]:self-start',
  feedback: 'my-3 flex flex-col gap-2',
  dialog: cn(
    dialogSurface,
    'max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100%-1.5rem)]',
  ),
  form: 'max-w-[1000px]',
  detail: 'max-w-[912px]',
  picker: 'max-w-[528px]',
  dialogHeader: dialogHeading,
  close: cn(iconButton, 'border-0 bg-page'),
  formFields:
    'm-0 mb-5 grid min-w-0 grid-cols-2 gap-4 border-0 p-0 max-sm:grid-cols-1 [&_input[readonly]]:text-muted',
  fieldError: 'text-xs leading-normal text-danger',
  fileControl:
    'relative flex min-h-24 items-center justify-start gap-3 rounded-control border border-control-border p-4 text-sm leading-normal text-slate-700 wrap-anywhere focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-focus [&_input]:absolute [&_input]:inset-0 [&_input]:h-full [&_input]:w-full [&_input]:cursor-pointer [&_input]:opacity-0 [&_svg]:shrink-0 [&_svg]:text-muted',
  helper: 'text-xs leading-normal text-muted',
  notice:
    'mt-5 flex items-start gap-3 rounded-summary border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-normal text-info [&>svg]:mt-0.5 [&>svg]:shrink-0',
  formActions:
    'mt-5 flex items-stretch justify-end gap-4 [&>button:first-child]:min-w-30 [&>button:last-child]:min-w-60 max-sm:flex-col max-sm:[&>button]:w-full max-sm:[&>button]:min-w-0',
  detailActions:
    'mt-5 flex items-stretch justify-end gap-4 [&>button]:flex-1 max-sm:flex-col',
  pickerActions:
    'mt-5 flex flex-wrap items-stretch justify-end gap-3 [&>button]:flex-1',
  typeList: 'm-0 mt-3 flex flex-col gap-2 border-0 p-0',
  typeOption:
    'flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-4 py-3 text-base leading-normal text-slate-700 data-[selected=true]:bg-emerald-50 data-[selected=true]:font-bold data-[selected=true]:text-success focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus [&>svg]:shrink-0 [&>svg]:text-muted data-[selected=true]:[&>svg]:text-action [&>span]:min-w-0 [&>span]:flex-1 [&>input]:m-0 [&>input]:size-[18px] [&>input]:shrink-0 [&>input]:accent-action max-sm:px-3 forced-colors:data-[selected=true]:border forced-colors:data-[selected=true]:border-[CanvasText]',
  detailStatus: '-mt-2 mb-5',
  details:
    'm-0 grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1 [&_dt]:mb-1 [&_dt]:text-sm [&_dt]:leading-normal [&_dt]:font-semibold [&_dt]:text-muted [&_dd]:m-0 [&_dd]:text-base [&_dd]:leading-normal [&_dd]:font-bold [&_dd]:wrap-anywhere [&_dd]:whitespace-pre-wrap',
  attachment:
    'mt-5 flex items-center justify-between gap-4 rounded-summary border border-border p-4 text-sm leading-normal [&>div]:min-w-0 [&>div]:wrap-anywhere [&_p]:mt-1 [&_p]:text-muted [&_button]:shrink-0 max-sm:flex-col max-sm:items-start',
  history:
    'mt-5 rounded-summary border border-border px-4 py-3 text-sm leading-normal [&_summary]:cursor-pointer [&_summary]:font-semibold [&_ol]:mb-0 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:py-2 [&_li]:ps-1 [&_li_time]:text-muted [&_li_p]:text-muted [&>p]:mt-3 [&>div]:mt-3',
  success:
    'mb-5 rounded-control bg-success-soft px-4 py-3 text-sm leading-normal text-success',
  srOnly: 'sr-only',
}

export default styles
