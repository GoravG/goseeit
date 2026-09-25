import React from 'react'
import { Activity, HardDrive, Cpu, MemoryStick } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RadialGauge } from '@/components/ui/radial-gauge'
import { SegmentedMeter, type MeterZone } from '@/components/ui/segmented-meter'
import { formatBytes } from '@/lib/utils'
import type { SystemSnapshot } from '@/types/metrics'

interface VisualGaugesSectionProps {
  snapshot: SystemSnapshot | null
}

export const VisualGaugesSection: React.FC<VisualGaugesSectionProps> = ({ snapshot }) => {
  const cpuPercent = Math.min(100, Math.max(0, snapshot?.cpu?.total_percent ?? 0))
  const memUsedPercent = Math.min(100, Math.max(0, snapshot?.memory?.used_percent ?? 0))
  const memUsedBytes = snapshot?.memory?.used_bytes ?? 0
  const memTotalBytes = snapshot?.memory?.total_bytes ?? 0
  const memFreeBytes = snapshot?.memory?.free_bytes ?? 0

  const primaryDisk = snapshot?.disks?.[0]
  const diskUsedPercent = Math.min(100, Math.max(0, primaryDisk?.used_percent ?? 0))

  const coreCount = snapshot?.cpu?.core_count || 1
  const load1 = snapshot?.host?.load_avg_1 ?? 0
  const loadRatio = Math.min(100, Math.round((load1 / coreCount) * 100))

  // Storage health zones
  const storageZones: MeterZone[] = [
    { label: 'Optimal', from: 0, to: 70, color: 'var(--color-emerald-500)' },
    { label: 'Warning', from: 70, to: 85, color: 'var(--color-amber-500)' },
    { label: 'Critical', from: 85, to: 100, color: 'var(--color-red-500)' },
  ]

  // CPU Load zones
  const loadZones: MeterZone[] = [
    { label: 'Light', from: 0, to: 50, color: 'var(--color-sky-500)' },
    { label: 'Moderate', from: 50, to: 80, color: 'var(--color-amber-500)' },
    { label: 'Heavy', from: 80, to: 100, color: 'var(--color-red-500)' },
  ]

  const getGaugeColor = (pct: number) => {
    if (pct > 85) return 'var(--color-red-500)'
    if (pct > 65) return 'var(--color-amber-500)'
    return 'var(--chart-1)'
  }

  const getMemColor = (pct: number) => {
    if (pct > 90) return 'var(--color-red-500)'
    if (pct > 75) return 'var(--color-amber-500)'
    return 'var(--color-emerald-500)'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU Radial Gauge */}
      <Card className="glass-panel border-white/5 flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              CPU Core Engine
            </CardTitle>
            <span className="text-xs font-mono text-slate-400">
              {snapshot?.cpu?.core_count ?? 1} Cores
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <RadialGauge
            value={cpuPercent}
            size={160}
            thickness={12}
            segments={28}
            sweep={180}
            color={getGaugeColor(cpuPercent)}
          >
            <div className="flex flex-col items-center justify-center mt-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-white">
                {cpuPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                Total Load
              </span>
            </div>
          </RadialGauge>
          <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Model:</span>
            <span className="text-slate-300 font-mono truncate max-w-[150px]">
              {snapshot?.cpu?.model_name || 'Generic Host'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Memory Capacity Radial Gauge */}
      <Card className="glass-panel border-white/5 flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-emerald-400" />
              Memory Allocation
            </CardTitle>
            <span className="text-xs font-mono text-slate-400">
              {formatBytes(memTotalBytes)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <RadialGauge
            value={memUsedPercent}
            size={160}
            thickness={10}
            sweep={240}
            startAngle={240}
            color={getMemColor(memUsedPercent)}
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                {memUsedPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                {formatBytes(memUsedBytes)} Used
              </span>
            </div>
          </RadialGauge>
          <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Available:</span>
            <span className="text-emerald-400 font-mono font-medium">
              {formatBytes(memFreeBytes)} Free
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Storage Health Segmented Meter */}
      <Card className="glass-panel border-white/5 flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Storage Capacity Zones
            </CardTitle>
            <span className="text-xs font-mono text-amber-400">
              {diskUsedPercent.toFixed(1)}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1 py-3 space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Primary Mount ({primaryDisk?.mount_point ?? '/'})</span>
              <span className="font-mono text-slate-200">
                {formatBytes(primaryDisk?.used_bytes ?? 0)} / {formatBytes(primaryDisk?.total_bytes ?? 0)}
              </span>
            </div>
            <SegmentedMeter
              value={diskUsedPercent}
              zones={storageZones}
              showTicks={true}
              showLabels={true}
              tickFormatter={(v) => `${v}%`}
              className="py-1"
            />
          </div>

          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div className="glass-panel-subtle p-2">
              <div className="text-[10px] text-slate-400 uppercase">Read Speed</div>
              <div className="font-mono text-emerald-400 font-medium mt-0.5">
                {formatBytes(primaryDisk?.read_bytes_per_sec ?? 0)}/s
              </div>
            </div>
            <div className="glass-panel-subtle p-2">
              <div className="text-[10px] text-slate-400 uppercase">Write Speed</div>
              <div className="font-mono text-sky-400 font-medium mt-0.5">
                {formatBytes(primaryDisk?.write_bytes_per_sec ?? 0)}/s
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Load Ratio & Status Meter */}
      <Card className="glass-panel border-white/5 flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Load Average Pressure
            </CardTitle>
            <span className="text-xs font-mono text-indigo-400">
              {loadRatio}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1 py-3 space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">1m Load / Core Capacity</span>
              <span className="font-mono text-slate-200">
                {load1.toFixed(2)} / {coreCount}.0
              </span>
            </div>
            <SegmentedMeter
              value={loadRatio}
              zones={loadZones}
              showTicks={true}
              showLabels={true}
              tickFormatter={(v) => `${v}%`}
              className="py-1"
            />
          </div>

          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="glass-panel-subtle py-1.5 px-1">
              <div className="text-[10px] text-slate-400">1 min</div>
              <div className="font-mono text-slate-200 font-medium">{load1.toFixed(2)}</div>
            </div>
            <div className="glass-panel-subtle py-1.5 px-1">
              <div className="text-[10px] text-slate-400">5 min</div>
              <div className="font-mono text-slate-300 font-medium">{snapshot?.host?.load_avg_5?.toFixed(2) ?? '0.00'}</div>
            </div>
            <div className="glass-panel-subtle py-1.5 px-1">
              <div className="text-[10px] text-slate-400">15 min</div>
              <div className="font-mono text-slate-400 font-medium">{snapshot?.host?.load_avg_15?.toFixed(2) ?? '0.00'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
