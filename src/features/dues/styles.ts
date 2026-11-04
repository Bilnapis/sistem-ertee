import { cn } from '../../lib/cn'
import {
  badge,
  buttons,
  dialogHeading,
  dialogSurface,
  field,
  iconButton,
  pageContent,
  surface,
} from '../../components/ui'

/** Billing utilities are shared across resident and manager routes. */
const styles = {
  page: '@container/page min-w-0 flex-1 p-6 max-sm:px-4',
  pageContent,
  pageHeader:
    'flex flex-wrap items-center justify-between gap-4 [&>div]:min-w-0 [&>div]:flex-[1_1_20rem]',
  billHeading: 'flex flex-wrap items-center justify-between gap-4',
  overview: 'flex flex-col gap-6',
  bill: cn(
    surface,
    'flex flex-col gap-5 p-6 @max-[580px]/page:p-5 [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-bold',
  ),
  billDetails:
    'm-0 grid grid-cols-5 gap-6 @max-[1000px]/page:grid-cols-3 @max-[580px]/page:grid-cols-2 @max-[580px]/page:gap-4 [&_dt]:text-sm [&_dt]:leading-normal [&_dt]:font-semibold [&_dt]:text-muted [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:text-lg [&_dd]:leading-normal [&_dd]:font-bold [&_dd]:wrap-anywhere @max-[580px]/page:[&_dd]:text-base',
  billActions:
    'flex flex-wrap items-center gap-4 [&>a:first-child]:min-w-60 @max-[580px]/page:[&>a:first-child]:w-full @max-[580px]/page:[&>a:first-child]:min-w-0',
  primary: buttons.primary,
  secondary: buttons.secondary,
  danger: buttons.danger,
  textLink: buttons.text,
  badge: cn(
    badge,
    'min-h-8 justify-center bg-danger-soft text-center text-danger data-[status=lunas]:bg-success-soft data-[status=lunas]:text-success data-[status=menunggu_verifikasi]:bg-warning-soft data-[status=menunggu_verifikasi]:text-warning',
  ),
  success:
    'flex items-center gap-3 rounded-summary bg-emerald-50 p-4 text-sm leading-relaxed text-success wrap-anywhere forced-colors:border forced-colors:border-[CanvasText] [&>svg]:shrink-0',
  notice:
    'block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed text-warning wrap-anywhere forced-colors:border forced-colors:border-[CanvasText]',
  list: cn(surface, 'min-w-0 overflow-hidden'),
  listHeader:
    'px-5 pt-5 [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted',
  helper: 'text-xs leading-relaxed text-muted',
  filters:
    'flex flex-wrap items-start gap-4 p-5 [&>*]:min-w-0 [&>*]:flex-[1_1_10rem]',
  field,
  tableRegion:
    'overflow-x-auto overscroll-x-contain [&_table]:w-full [&_table]:min-w-[760px] [&_table]:border-collapse [&_table]:text-start [&_table]:text-sm [&_table]:leading-normal [&_th]:border-b [&_th]:border-border [&_th]:px-5 [&_th]:py-4 [&_th]:text-start [&_td]:border-b [&_td]:border-border [&_td]:px-5 [&_td]:py-4 [&_td]:text-start [&_thead_th]:bg-page [&_thead_th]:text-xs [&_thead_th]:font-bold [&_thead_th]:text-muted [&_thead_th]:uppercase [&_tbody_th]:font-normal [&_td]:text-slate-700 [&_small]:block [&_small]:text-muted [&_tr:last-child>*]:border-b-0',
  empty: 'px-5! py-9! text-center!',
  scrollHint: 'mx-5 mb-3 flex items-center gap-2 text-xs text-muted',
  pagination:
    'flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-muted [&>div]:flex [&>div]:gap-2',
  iconButton,
  close: cn(iconButton, 'border-0 bg-page'),
  dialog: cn(
    dialogSurface,
    'w-[calc(100%-2rem)] max-w-[648px] [&_form>*+*]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&>*+*]:mt-5',
  ),
  dialogHeader: cn(dialogHeading, 'mb-0 items-center gap-3'),
  paymentSummary:
    'm-0 mt-5 rounded-summary bg-page p-5 [&>div]:flex [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-4 [&>div]:text-base [&>div]:leading-relaxed [&_dt]:text-muted [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:text-end [&_dd]:font-bold [&_dd]:wrap-anywhere max-sm:[&>div]:mb-2 max-sm:[&>div]:flex-col max-sm:[&>div]:gap-0 max-sm:[&_dd]:text-start',
  formFields: 'flex min-w-0 flex-col gap-4 border-0 p-0',
  methods:
    'flex flex-wrap gap-3 border-0 p-0 [&_legend]:mb-2 [&_legend]:text-sm [&_legend]:leading-normal [&_legend]:font-semibold [&_label]:flex [&_label]:min-h-12 [&_label]:min-w-0 [&_label]:flex-1 [&_label]:items-center [&_label]:gap-3 [&_label]:rounded-control [&_label]:border [&_label]:border-border [&_label]:px-4 [&_label]:py-3 [&_label]:font-semibold [&_label:has(input:checked)]:border-action [&_label:has(input:checked)]:bg-emerald-50 [&_label:has(input:disabled)]:text-muted [&_input]:size-[18px] [&_input]:accent-action forced-colors:[&_label]:border-[CanvasText]',
  bank: 'rounded-summary bg-page p-4 text-sm leading-relaxed text-slate-700 wrap-anywhere',
  upload:
    'flex flex-col items-center gap-2 rounded-summary border border-border bg-page p-5 text-center [&_label]:text-sm [&_label]:font-bold [&_p]:text-xs [&_p]:text-muted [&_input]:max-w-full [&_input]:text-sm [&_input]:file:me-2 [&_input]:file:cursor-pointer [&_input]:file:rounded-lg [&_input]:file:border [&_input]:file:border-border [&_input]:file:bg-surface [&_input]:file:p-2 [&_input]:file:font-semibold [&_input]:file:text-action',
  fileName: 'text-sm wrap-anywhere',
  dialogActions:
    'mt-5 flex flex-wrap items-center gap-4 [&>*]:flex-[1_1_12rem]',
  twoColumns: 'grid grid-cols-2 gap-4 max-sm:grid-cols-1',
  detailSection: 'flex flex-col gap-3',
  attempt:
    'flex flex-col gap-3 rounded-summary border border-border p-5 [&_p]:text-sm [&_p]:leading-relaxed',
  review: 'flex flex-col gap-3 rounded-summary border border-border p-5',
  attemptStatus:
    'text-xs font-bold text-warning data-[status=disetujui]:text-success data-[status=ditolak]:text-danger data-[status=dibatalkan]:text-danger',
  confirmation: 'rounded-control bg-orange-50 p-4 text-sm leading-relaxed',
  preWrap: 'wrap-anywhere whitespace-pre-wrap',
  timeline:
    'm-0 list-disc ps-5 text-sm leading-relaxed [&_li]:pb-4 [&_li]:ps-2 [&_time]:text-xs [&_time]:text-muted',
  feedback: 'flex flex-col items-start gap-3',
  srOnly: 'sr-only',
}

export default styles
