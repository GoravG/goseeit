import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#2a2a2a] text-[#ededed] border-white/10',
    success: 'bg-[#00bb7f]/15 text-[#00bb7f] border-[#00bb7f]/30',
    warning: 'bg-[#f99c00]/15 text-[#f99c00] border-[#f99c00]/30',
    destructive: 'bg-[#fb2c36]/15 text-[#ff6568] border-[#fb2c36]/30',
    outline: 'text-[#969696] border-white/10 bg-transparent',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}
