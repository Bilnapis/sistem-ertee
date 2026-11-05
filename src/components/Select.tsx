import type { ComponentPropsWithRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/cn'

export type SelectProps = ComponentPropsWithRef<'select'> & {
  wrapperClassName?: string
}

export function Select({ className, wrapperClassName, ...props }: SelectProps) {
  return (
    <div className={cn('relative w-full min-w-0', wrapperClassName)}>
      <select
        {...props}
        className={cn(
          'min-h-12 w-full min-w-0 appearance-none rounded-control border border-control-border bg-surface px-3 py-2.5 pe-11 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:not-focus:not-aria-invalid:not-disabled:border-slate-600 focus:border-action focus:ring-3 focus:ring-focus-soft focus-visible:outline focus-visible:outline-offset-0 focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 disabled:ring-0 disabled:outline-none aria-invalid:border-danger aria-invalid:focus:ring-danger-soft aria-invalid:focus-visible:outline-danger disabled:aria-invalid:border-border motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-150 motion-safe:ease-out forced-colors:appearance-auto forced-colors:pe-3 forced-colors:focus:outline-2 forced-colors:focus:outline-offset-2 forced-colors:focus:outline-[Highlight]',
          className,
        )}
      />
      <ChevronDown
        className="pointer-events-none absolute inset-y-0 end-3 my-auto text-muted forced-colors:hidden"
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  )
}
