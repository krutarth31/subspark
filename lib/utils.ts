import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateUTC(date: string | number | Date) {
  return new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC' })
}
