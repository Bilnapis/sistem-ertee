import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Caller utilities override defaults without depending on class attribute order. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
