import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indicatorClassName?: string
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value))
    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80', className)}
        {...props}
      >
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', indicatorClassName || 'bg-sky-500')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'
