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
    { label: 'Optimal', from: 0, to: 70, color: '#00bb7f' },
    { label: 'Warning', from: 70, to: 85, color: '#f99c00' },
    { label: 'Critical', from: 85, to: 100, color: '#fb2c36' },
  ]

  // CPU Load zones
  const loadZones: MeterZone[] = [
    { label: 'Light', from: 0, to: 50, color: '#2f5bff' },
    { label: 'Moderate', from: 50, to: 80, color: '#f99c00' },
    { label: 'Heavy', from: 80, to: 100, color: '#fb2c36' },
  ]

  const getGaugeColor = (pct: number) => {
    if (pct > 85) return '#fb2c36'
    if (pct > 65) return '#f99c00'
    return '#2f5bff'
  }

  const getMemColor = (pct: number) => {
    if (pct > 90) return '#fb2c36'
    if (pct > 75) return '#f99c00'
    return '#00bb7f'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* CPU Radial Gauge */}
      <Card className="flex flex-col justify-between hover:border-white/20 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#ededed] flex items-center gap-2">
              <Cpu className="size-4 text-[#2f5bff]" />
              CPU Core Engine
            </CardTitle>
            <span className="text-xs font-mono text-[#969696]">
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
            trackColor="#2a2a2a"
          >
            <div className="flex flex-col items-center justify-center mt-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-white">
                {cpuPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#969696] font-mono uppercase tracking-wider">
                Total Load
              </span>
            </div>
          </RadialGauge>
          <div className="w-full mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#969696]">
            <span>Model:</span>
            <span className="text-[#ededed] font-mono truncate max-w-[150px]">
              {snapshot?.cpu?.model_name || 'Generic Host'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Memory Capacity Radial Gauge */}
      <Card className="flex flex-col justify-between hover:border-white/20 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#ededed] flex items-center gap-2">
              <MemoryStick className="size-4 text-[#00bb7f]" />
              Memory Allocation
            </CardTitle>
            <span className="text-xs font-mono text-[#969696]">
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
            trackColor="#2a2a2a"
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono tracking-tight text-[#00bb7f]">
                {memUsedPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#969696] font-mono uppercase tracking-wider">
                {formatBytes(memUsedBytes)} Used
              </span>
            </div>
          </RadialGauge>
          <div className="w-full mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#969696]">
            <span>Available:</span>
            <span className="text-[#00bb7f] font-mono font-medium">
              {formatBytes(memFreeBytes)} Free
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Storage Health Segmented Meter */}
      <Card className="flex flex-col justify-between hover:border-white/20 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#ededed] flex items-center gap-2">
              <HardDrive className="size-4 text-[#f99c00]" />
              Storage Zones
            </CardTitle>
            <span className="text-xs font-mono text-[#f99c00] font-semibold">
              {diskUsedPercent.toFixed(1)}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1 py-3 space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-[#969696]">Mount ({primaryDisk?.mount_point ?? '/'})</span>
              <span className="font-mono text-[#ededed]">
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

          <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#26262a] border border-white/5 p-2 rounded-lg">
              <div className="text-[10px] text-[#969696] uppercase font-mono">Read</div>
              <div className="font-mono text-[#00bb7f] font-semibold mt-0.5">
                {formatBytes(primaryDisk?.read_bytes_per_sec ?? 0)}/s
              </div>
            </div>
            <div className="bg-[#26262a] border border-white/5 p-2 rounded-lg">
              <div className="text-[10px] text-[#969696] uppercase font-mono">Write</div>
              <div className="font-mono text-[#2f5bff] font-semibold mt-0.5">
                {formatBytes(primaryDisk?.write_bytes_per_sec ?? 0)}/s
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Load Ratio & Status Meter */}
      <Card className="flex flex-col justify-between hover:border-white/20 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#ededed] flex items-center gap-2">
              <Activity className="size-4 text-[#2f5bff]" />
              Load Saturation
            </CardTitle>
            <span className="text-xs font-mono text-[#2f5bff] font-semibold">
              {loadRatio}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1 py-3 space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-[#969696]">1m Load / Cores</span>
              <span className="font-mono text-[#ededed]">
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

          <div className="pt-3 border-t border-white/5 grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="bg-[#26262a] border border-white/5 py-1.5 px-1 rounded-lg">
              <div className="text-[10px] text-[#969696] font-mono">1m</div>
              <div className="font-mono text-[#ededed] font-semibold">{load1.toFixed(2)}</div>
            </div>
            <div className="bg-[#26262a] border border-white/5 py-1.5 px-1 rounded-lg">
              <div className="text-[10px] text-[#969696] font-mono">5m</div>
              <div className="font-mono text-[#969696] font-medium">{snapshot?.host?.load_avg_5?.toFixed(2) ?? '0.00'}</div>
            </div>
            <div className="bg-[#26262a] border border-white/5 py-1.5 px-1 rounded-lg">
              <div className="text-[10px] text-[#969696] font-mono">15m</div>
              <div className="font-mono text-[#6d6d6d] font-medium">{snapshot?.host?.load_avg_15?.toFixed(2) ?? '0.00'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
