import { cn } from '../lib/cn'

export function Logo({
  className,
  alt = 'WargaKita',
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src="/logo.jpeg"
      alt={alt}
      width={1280}
      height={1280}
      className={cn(
        'block size-24 shrink-0 rounded-control object-contain',
        className,
      )}
    />
  )
}
