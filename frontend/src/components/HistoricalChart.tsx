import React, { useEffect, useState, useRef } from 'react'
import { LineChart, History } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { db } from '@/lib/db'
import { formatSpeed } from '@/lib/utils'
import type { HistoricalMetricPoint } from '@/types/metrics'

type TimeWindow = 15 | 60 | 360 | 1440
type MetricKey = 'cpu_total' | 'mem_used_pct' | 'net_rx_bps' | 'disk_write_bps'

export const HistoricalChart: React.FC = () => {
  const [windowMin, setWindowMin] = useState<TimeWindow>(60)
  const [metricKey, setMetricKey] = useState<MetricKey>('cpu_total')
  const [data, setData] = useState<HistoricalMetricPoint[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalMetricPoint | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    try {
      const points = await db.getAggregatedPoints(windowMin, 80)
      setData(points)
    } catch (e) {
      console.error('Failed to load historical points from IndexedDB', e)
    }
  }

  useEffect(() => {
    fetchData()
    // Poll local IndexedDB every 3 seconds for updated aggregations
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [windowMin])

  interface MetricSetting {
    label: string
    unit: string
    color: string
    max?: number
    format?: (val: number) => string
  }

  // Color mappings
  const metricConfigs: Record<MetricKey, MetricSetting> = {
    cpu_total: { label: 'CPU Usage', unit: '%', color: '#38bdf8', max: 100 },
    mem_used_pct: { label: 'RAM Usage', unit: '%', color: '#10b981', max: 100 },
    net_rx_bps: { label: 'Network Down', unit: '', color: '#3b82f6', format: formatSpeed },
    disk_write_bps: { label: 'Disk Write', unit: '', color: '#f59e0b', format: formatSpeed },
  }

  const currentConfig: MetricSetting = metricConfigs[metricKey]

  // Calculate scales for SVG
  const values = data.map((d) => (d[metricKey] as number) || 0)
  const maxValue = currentConfig.max || (values.length > 0 ? Math.max(...values, 1024) * 1.15 : 100)

  const width = 800
  const height = 220
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left
    return padding.left + (idx / (data.length - 1)) * chartW
  }

  const getY = (val: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxValue))
    return padding.top + chartH - ratio * chartH
  }

  const pointsSvg = data.map((d, i) => `${getX(i)},${getY((d[metricKey] as number) || 0)}`).join(' ')
  const areaSvg = data.length > 0
    ? `${padding.left},${padding.top + chartH} ${pointsSvg} ${padding.left + chartW},${padding.top + chartH}`
    : ''

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-sky-400" />
            <div>
              <CardTitle>Historical Performance (IndexedDB)</CardTitle>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <History className="w-3 h-3" /> Client-side zero-server TSDB storage
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric toggles */}
            <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
              {(['cpu_total', 'mem_used_pct', 'net_rx_bps', 'disk_write_bps'] as MetricKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setMetricKey(key)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    metricKey === key ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {metricConfigs[key].label.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Time window selector */}
            <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
              {[
                { label: '15m', val: 15 },
                { label: '1h', val: 60 },
                { label: '6h', val: 360 },
                { label: '24h', val: 1440 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setWindowMin(val as TimeWindow)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    windowMin === val ? 'bg-sky-500 text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full relative overflow-hidden pt-2">
          {data.length < 2 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-500">
              Collecting historical data points into IndexedDB...
            </div>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px] overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                const y = padding.top + chartH * (1 - r)
                const val = maxValue * r
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + chartW}
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="4 4"
                    />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-500 font-mono">
                      {currentConfig.format ? currentConfig.format(val) : `${val.toFixed(0)}${currentConfig.unit}`}
                    </text>
                  </g>
                )
              })}

              {/* Area fill */}
              {areaSvg && <polygon points={areaSvg} fill="url(#chartGradient)" />}

              {/* Line stroke */}
              {pointsSvg && (
                <polyline
                  points={pointsSvg}
                  fill="none"
                  stroke={currentConfig.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive hover circles */}
              {data.map((d, i) => {
                const cx = getX(i)
                const cy = getY((d[metricKey] as number) || 0)
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="4"
                    className="opacity-0 hover:opacity-100 fill-white cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredPoint(d)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )
              })}
            </svg>
          )}

          {/* Hover tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 right-6 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl backdrop-blur-md">
              <div className="text-slate-400 text-[10px]">{new Date(hoveredPoint.timestamp).toLocaleTimeString()}</div>
              <div className="text-white font-semibold">
                {currentConfig.label}:{' '}
                {currentConfig.format
                  ? currentConfig.format((hoveredPoint[metricKey] as number) || 0)
                  : `${(hoveredPoint[metricKey] as number)?.toFixed(1)}${currentConfig.unit}`}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
