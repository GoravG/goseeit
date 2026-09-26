import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { History, TrendingUp, Cpu, Network, HardDrive } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendChart, type TrendSeries } from '@/components/ui/trend-chart'
import { db } from '@/lib/db'
import { formatSpeed } from '@/lib/utils'
import type { HistoricalMetricPoint } from '@/types/metrics'

type TimeWindow = 15 | 60 | 360 | 1440
type Category = 'system' | 'network' | 'disk'

export const HistoricalChart: React.FC = () => {
  const [windowMin, setWindowMin] = useState<TimeWindow>(60)
  const [category, setCategory] = useState<Category>('system')
  const [chartType, setChartType] = useState<'area' | 'line'>('area')
  const [rawPoints, setRawPoints] = useState<HistoricalMetricPoint[]>([])
  const [initialTime] = useState(() => Date.now())

  const fetchData = useCallback(async () => {
    try {
      const points = await db.getAggregatedPoints(windowMin, 50)
      setRawPoints(points)
    } catch (e) {
      console.error('Failed to load historical points from IndexedDB', e)
    }
  }, [windowMin])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Transform raw points for TrendChart
  const chartData = useMemo(() => {
    if (rawPoints.length === 0) {
      // Provide dummy fallback points so chart renders gracefully on initial load
      return Array.from({ length: 10 }, (_, i) => {
        const t = new Date(initialTime - (9 - i) * 60000)
        return {
          time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: 0,
          memory: 0,
          rx: 0,
          tx: 0,
          read: 0,
          write: 0,
        }
      })
    }

    return rawPoints.map((p) => {
      const d = new Date(p.timestamp)
      const timeStr = d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        ...(windowMin <= 60 ? { second: '2-digit' } : {}),
      })

      return {
        time: timeStr,
        cpu: Number(p.cpu_total.toFixed(1)),
        memory: Number(p.mem_used_pct.toFixed(1)),
        rx: Math.round(p.net_rx_bps / 1024), // KB/s
        tx: Math.round(p.net_tx_bps / 1024), // KB/s
        read: Math.round(p.disk_read_bps / 1024), // KB/s
        write: Math.round(p.disk_write_bps / 1024), // KB/s
      }
    })
  }, [rawPoints, windowMin, initialTime])

  // Dynamic series configuration
  const series: TrendSeries[] = useMemo(() => {
    if (category === 'system') {
      return [
        { key: 'cpu', label: 'CPU Usage (%)', color: 'var(--chart-1)' },
        { key: 'memory', label: 'Memory Usage (%)', color: 'var(--chart-2)' },
      ]
    }
    if (category === 'network') {
      return [
        { key: 'rx', label: 'Download (KB/s)', color: 'var(--chart-1)' },
        { key: 'tx', label: 'Upload (KB/s)', color: 'var(--chart-4)' },
      ]
    }
    return [
      { key: 'read', label: 'Disk Read (KB/s)', color: 'var(--chart-2)' },
      { key: 'write', label: 'Disk Write (KB/s)', color: 'var(--chart-3)' },
    ]
  }, [category])

  // Custom Y-axis formatter
  const yFormatter = (value: number) => {
    if (category === 'system') {
      return `${Math.round(value)}%`
    }
    return formatSpeed(value * 1024)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2f5bff]/10 border border-[#2f5bff]/20 text-[#2f5bff]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#ededed]">
                Historical Telemetry & Metrics
              </CardTitle>
              <div className="text-xs text-[#969696] flex items-center gap-1.5 mt-0.5">
                <History className="w-3 h-3 text-[#6d6d6d]" />
                <span>Zero-footprint client persistence (Browser IndexedDB)</span>
              </div>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category tabs */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#1c1c1e] border border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setCategory('system')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  category === 'system'
                    ? 'bg-[#2f5bff] text-white font-medium shadow-sm'
                    : 'text-[#969696] hover:text-[#ededed] hover:bg-white/5'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>CPU & RAM</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('network')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  category === 'network'
                    ? 'bg-[#2f5bff] text-white font-medium shadow-sm'
                    : 'text-[#969696] hover:text-[#ededed] hover:bg-white/5'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Network</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('disk')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  category === 'disk'
                    ? 'bg-[#2f5bff] text-white font-medium shadow-sm'
                    : 'text-[#969696] hover:text-[#ededed] hover:bg-white/5'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Disk I/O</span>
              </button>
            </div>

            {/* Time Window Buttons */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#1c1c1e] border border-white/[0.06] text-xs font-mono">
              {(
                [
                  { label: '15m', val: 15 },
                  { label: '1h', val: 60 },
                  { label: '6h', val: 360 },
                  { label: '24h', val: 1440 },
                ] as const
              ).map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWindowMin(val)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    windowMin === val
                      ? 'bg-[#2f5bff] text-white font-semibold shadow-sm'
                      : 'text-[#969696] hover:text-[#ededed] hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Area / Line Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#1c1c1e] border border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartType === 'area'
                    ? 'bg-[#2e2e2e] text-white font-medium'
                    : 'text-[#969696] hover:text-[#ededed] hover:bg-white/5'
                }`}
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartType === 'line'
                    ? 'bg-[#2e2e2e] text-white font-medium'
                    : 'text-[#969696] hover:text-[#ededed] hover:bg-white/5'
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        <div className="h-[260px] w-full">
          <TrendChart
            data={chartData}
            xKey="time"
            series={series}
            type={chartType}
            fill="gradient"
            showLegend={true}
            legendPosition="top"
            legendAlign="right"
            showGrid={true}
            showYAxis={true}
            yFormatter={yFormatter}
            xFormatter={(v) => String(v)}
            yDomain={category === 'system' ? [0, 100] : [0, 'auto']}
            className="h-full w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}
