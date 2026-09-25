"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { type NumberFormat } from "@/lib/format"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DeltaBadge, getDeltaDirection } from "@/components/ui/delta-badge"
import { Sparkline } from "@/components/ui/sparkline"
import { MetricValue } from "@/components/ui/metric-value"

export interface KpiCardProps extends Omit<
  React.ComponentProps<typeof Card>,
  "children"
> {
  /** Metric name, e.g. "Revenue". */
  label: string
  /** Current value. Numbers are formatted with `format`; strings render as-is. */
  value: number | string
  /** Fractional change vs. the previous period, e.g. 0.124 for +12.4%. */
  delta?: number
  /** Context for the delta, e.g. "vs. last 30 days". */
  deltaLabel?: string
  /** Series for the sparkline. Rendered when it has two or more points. */
  trend?: number[]
  format?: NumberFormat
  /** ISO 4217 code, used when `format` is "currency". */
  currency?: string
  /** Treat a decrease as good and an increase as bad (churn, latency, errors). */
  invertDelta?: boolean
  /** Optional icon shown before the label. */
  icon?: React.ReactNode
  children?: React.ReactNode
}

function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  format = "number",
  currency,
  invertDelta = false,
  icon,
  className,
  children,
  ...props
}: KpiCardProps) {
  const direction = getDeltaDirection(delta)
  const isPositive =
    direction === "flat" ? null : (direction === "up") !== invertDelta
  const trendColor =
    isPositive === true
      ? "var(--color-emerald-500)"
      : isPositive === false
        ? "var(--color-red-500)"
        : "var(--primary)"

  return (
    <Card
      data-slot="kpi-card"
      data-direction={direction}
      className={cn("gap-4 py-5", className)}
      {...props}
    >
      <CardHeader className="px-5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 w-full">
          <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground truncate [&>svg]:size-4">
            {icon}
            <span className="truncate">{label}</span>
          </CardDescription>
          {delta !== undefined ? (
            <div className="shrink-0">
              <DeltaBadge delta={delta} invert={invertDelta} />
            </div>
          ) : null}
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
          <MetricValue value={value} format={format} currency={currency} className="whitespace-nowrap" />
        </CardTitle>
      </CardHeader>
      {trend && trend.length > 1 ? (
        <CardContent className="px-5">
          <Sparkline data={trend} color={trendColor} />
        </CardContent>
      ) : null}
      {deltaLabel || children ? (
        <CardContent className="text-muted-foreground flex items-center justify-between gap-1.5 px-5 text-xs whitespace-nowrap overflow-hidden">
          {deltaLabel ? <span className="truncate">{deltaLabel}</span> : null}
          {children}
        </CardContent>
      ) : null}
    </Card>
  )
}

export { KpiCard }
