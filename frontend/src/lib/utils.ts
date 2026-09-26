import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0\u00A0B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const idx = Math.min(i, sizes.length - 1)
  // Use non-breaking space (\u00A0) so values like "31 KB" never wrap onto two lines
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))}\u00A0${sizes[idx]}`
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec === 0) return '0\u00A0B/s'
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}

export type DeltaDirection = 'up' | 'down' | 'flat'

export function getDeltaDirection(delta: number | undefined): DeltaDirection {
  if (delta === undefined || delta === 0 || !Number.isFinite(delta)) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

