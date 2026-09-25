import React from 'react'
import { Cpu, HardDrive, MemoryStick, Network, Zap, Clock } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { formatBytes, formatSpeed, formatUptime } from '@/lib/utils'
import type { SystemSnapshot } from '@/types/metrics'

interface OverviewCardsProps {
  snapshot: SystemSnapshot | null
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ snapshot }) => {
  const cpuPercent = snapshot?.cpu?.total_percent ?? 0
  const memUsedPercent = snapshot?.memory?.used_percent ?? 0
  const memUsedBytes = snapshot?.memory?.used_bytes ?? 0
  const memTotalBytes = snapshot?.memory?.total_bytes ?? 0

  const gpu = snapshot?.gpu
  const gpuAvailable = gpu?.available ?? false
  const gpuUsage = gpu?.usage_percent ?? 0

  // Calculate primary disk usage
  const primaryDisk = snapshot?.disks?.[0]
  const diskUsedPercent = primaryDisk?.used_percent ?? 0
  const diskUsedBytes = primaryDisk?.used_bytes ?? 0
  const diskTotalBytes = primaryDisk?.total_bytes ?? 0

  // Calculate total network traffic speed
  let totalRx = 0
  let totalTx = 0
  if (snapshot?.networks) {
    for (const n of snapshot.networks) {
      totalRx += n.rx_bytes_per_sec || 0
      totalTx += n.tx_bytes_per_sec || 0
    }
  }

  const uptimeSec = snapshot?.host?.uptime_seconds ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* CPU Card */}
      <Card className="hover:border-sky-500/40 transition-all duration-300">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">CPU Usage</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white">{cpuPercent.toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {snapshot?.cpu?.core_count ?? 0} Cores
            </div>
          </div>
          <Progress
            value={cpuPercent}
            indicatorClassName={cpuPercent > 85 ? 'bg-rose-500' : cpuPercent > 65 ? 'bg-amber-500' : 'bg-sky-400'}
            className="mt-3"
          />
        </CardContent>
      </Card>

      {/* Memory Card */}
      <Card className="hover:border-emerald-500/40 transition-all duration-300">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">RAM Usage</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <MemoryStick className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white">{memUsedPercent.toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatBytes(memUsedBytes)} / {formatBytes(memTotalBytes)}
            </div>
          </div>
          <Progress
            value={memUsedPercent}
            indicatorClassName={memUsedPercent > 85 ? 'bg-rose-500' : memUsedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-400'}
            className="mt-3"
          />
        </CardContent>
      </Card>

      {/* GPU Card */}
      <Card className="hover:border-purple-500/40 transition-all duration-300">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">GPU (iGPU)</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white">
              {gpuAvailable ? `${gpuUsage.toFixed(1)}%` : 'Standby'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {gpuAvailable && gpu?.cur_freq_mhz
                ? `${gpu.cur_freq_mhz} MHz / ${gpu.max_freq_mhz || 0} MHz`
                : gpu?.device_name || 'Integrated'}
            </div>
          </div>
          <Progress
            value={gpuAvailable ? gpuUsage : 0}
            indicatorClassName="bg-purple-400"
            className="mt-3"
          />
        </CardContent>
      </Card>

      {/* Disk Storage Card */}
      <Card className="hover:border-amber-500/40 transition-all duration-300">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-bold tracking-tight text-white">{diskUsedPercent.toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatBytes(diskUsedBytes)} / {formatBytes(diskTotalBytes)}
            </div>
          </div>
          <Progress
            value={diskUsedPercent}
            indicatorClassName={diskUsedPercent > 90 ? 'bg-rose-500' : 'bg-amber-400'}
            className="mt-3"
          />
        </CardContent>
      </Card>

      {/* Network & Uptime Card */}
      <Card className="hover:border-blue-500/40 transition-all duration-300">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Network & Uptime</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span className="text-emerald-400">↓ {formatSpeed(totalRx)}</span>
              <span className="text-slate-500">|</span>
              <span className="text-sky-400">↑ {formatSpeed(totalTx)}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Up: {formatUptime(uptimeSec)}</span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden mt-3">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
